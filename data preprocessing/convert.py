#!/usr/bin/env python
import sys
import argparse
import networkx as nx
import json
import community as community_louvain
from networkx.readwrite import json_graph


def graphmltojson(graphfile, outfile):
	"""
	Converts GraphML file to json while adding communities/modularity groups
	using python-louvain. JSON output is usable with D3 force layout.
	Usage:
	>>> python convert.py -i mygraph.graphml -o outfile.json
	"""
	
	G = nx.read_graphml(graphfile)	

	#finds best community using louvain
	partition = community_louvain.best_partition(G)

	#adds partition/community number as attribute named 'modularitygroup'
	for n,d in G.nodes(data=True):
		d['modularitygroup'] = partition[n]

	node_link = json_graph.node_link_data(G)
	json_file = json.dumps(node_link)
	
	# Write to file
	fo = open(outfile, "w")
	fo.write(json_file);
	fo.close()

if __name__ == '__main__':
	parser = argparse.ArgumentParser(description='Convert from GraphML to json. ')
	parser.add_argument('-i','--input', help='Input file name (graphml)',required=True)
	parser.add_argument('-o','--output', help='Output file name/path',required=True)
	args = parser.parse_args()
	graphmltojson(args.input, args.output)
