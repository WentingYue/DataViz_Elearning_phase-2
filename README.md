# Data Viz Elearning - phase 2
This repository contains codes and graphs for the viz_elearning project in the Center for Design, CAMD, Northeastern University.
## Data preprocessing
1. Data processing.ipynb transforms data structure into network graph. Network data is filtered based on org_position
2. Convert graph file into json, usage: python convert.py -i mygraph.graphml -o outfile.json
3. Tree.csv is extracted from the position columns of org_position.xlsx
## Visualization
1. seperate graph: network_test, tree_test, catogram/index
2. development: D3_prototype