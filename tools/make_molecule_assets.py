"""Build the molecule viewer's files from a VERIFIED structure.

Usage (run from the repo root):
  python3 tools/make_molecule_assets.py --smiles "<lab-verified SMILES>" --source "how it was verified"
  python3 tools/make_molecule_assets.py --molfile verified.sdf --source "SDF from the lab, 2026-10"

Writes, into molecules/:
  target.sdf      3D coordinates for the viewer (all atoms, explicit H)
  target-2d.svg   static 2D drawing, used when 3D isn't available
  target.json     formula, weight, and provenance shown under the model
and adds data-model="molecules/target.sdf" to the project card in
index.html, which switches the viewer on.

The 3D coordinates are generated computationally (RDKit ETKDGv3 embedding,
then MMFF94 force-field cleanup). That's why the page labels the model
"computational 3D model". Connectivity comes only from your input.

Stereochemistry: a 3D model has to pick a configuration at every
stereocenter. If the input leaves any stereocenter unassigned, the script
stops, unless you pass --allow-unassigned-stereo (e.g. the compound is a
racemate). Then the page says the model shows one arbitrary configuration.

Requires: pip install rdkit
"""
import argparse, json, sys
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

ap = argparse.ArgumentParser()
g = ap.add_mutually_exclusive_group(required=True)
g.add_argument("--smiles")
g.add_argument("--molfile")
ap.add_argument("--source", required=True, help="where the verified structure came from")
ap.add_argument("--allow-unassigned-stereo", action="store_true")
ap.add_argument("--out", default="molecules")
a = ap.parse_args()

mol = Chem.MolFromSmiles(a.smiles) if a.smiles else Chem.MolFromMolFile(a.molfile)
if mol is None:
    sys.exit("Could not read the structure. Check the SMILES / file.")

centers = Chem.FindMolChiralCenters(mol, includeUnassigned=True, useLegacyImplementation=False)
unassigned = [idx for idx, label in centers if label == "?"]
if unassigned and not a.allow_unassigned_stereo:
    sys.exit(f"{len(unassigned)} stereocenter(s) unassigned (atom indices {unassigned}). "
             "Specify them in the input, or pass --allow-unassigned-stereo if that is correct "
             "(the page will then say the model shows one arbitrary configuration).")

molH = Chem.AddHs(mol)
params = AllChem.ETKDGv3()
params.randomSeed = 7                     # reproducible conformer
if AllChem.EmbedMolecule(molH, params) != 0:
    sys.exit("3D embedding failed.")
AllChem.MMFFOptimizeMolecule(molH, maxIters=2000)

out = Path(a.out); out.mkdir(exist_ok=True)
molH.SetProp("_Name", "target")
Chem.MolToMolFile(molH, str(out / "target.sdf"))

d = rdMolDraw2D.MolDraw2DSVG(420, 300)
opts = d.drawOptions(); opts.clearBackground = False; opts.bondLineWidth = 2
d.DrawMolecule(Chem.Mol(mol)); d.FinishDrawing()
(out / "target-2d.svg").write_text(d.GetDrawingText())

meta = {
    "formula": rdMolDescriptors.CalcMolFormula(mol),
    "molecular_weight": round(Descriptors.MolWt(mol), 2),
    "canonical_smiles": Chem.MolToSmiles(mol),
    "unassigned_stereocenters": len(unassigned),
    "source": a.source,
    "coordinates": "RDKit ETKDGv3 embedding with MMFF94 cleanup",
    "computational": True,
}
(out / "target.json").write_text(json.dumps(meta, indent=2))
print(json.dumps(meta, indent=2))

# Switch the viewer on: the card in index.html only loads a model when it
# has data-model="molecules/target.sdf".
if a.out == "molecules":
    html = Path("index.html")
    page = html.read_text()
    tag = '<section class="mol-project"'
    if tag in page and 'data-model=' not in page:
        html.write_text(page.replace(tag, tag + ' data-model="molecules/target.sdf"', 1))
        print("Viewer enabled in index.html (data-model added).")
