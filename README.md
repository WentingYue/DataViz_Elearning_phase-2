# Data Viz Elearning - phase 2
This repository contains codes and graphs for the viz_elearning project in the Center for Design, CAMD, Northeastern University.
## Data preprocessing
1. Data processing.ipynb transforms data structure into network graph. Network data is filtered based on org_position
2. Convert graph file into json, usage: python convert.py -i mygraph.graphml -o outfile.json
3. Tree.csv is extracted from the position columns of org_position.xlsx
## Visualization
1. seperate graph: network_test, tree_test, catogram/index
2. development: D3_prototype

## Data

There are two datasets
1. Data.xlsx (5 sheets)
    - Employees
    - Knowledge Structure
    - Knowledge Assessment
    - Organizational Structure
    - Personas
2. hierachy_org_Position.xlsx
    - CDIO_COO_DIV PRIVATE BANKING
    - Private Banking
    - Organizational Position

### Employee data

#### Employees

* Contains data on employees such as employee id, age, sex, and organizational_position_id
* Not unique on ID_EMPLOYEE (23 cases where there are duplicate employee ids)
    - Potential data quality issue
    - There are only certain organization position ids that appear to have this issue: 4593, 4596, 4607, 5051, 5107, and 6145

#### Organizational Structure

* Contains data related to region such as province and region
* Provice is nested inside of region
    - There are 21 regions and 108 provinces

#### Knowledge Assessment

* This is a crosswalk between knowledge area and knowledge domain
     - This data is unique on ID_KNOWLEDGE_DOMAIN
     - Knowledge domain is nested within knowledge area (ID_KNOWLEDGE_AREA)

#### Knowledge Structure

#### Personas

### Hierarchy data