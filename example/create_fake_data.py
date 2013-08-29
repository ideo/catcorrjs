#!/usr/bin/env python

"""quick 'n dirty script to create a fake data set from a hypothetical
survey asking the stereotypical categorical questions.
"""

import json
import random
import optparse

parser = optparse.OptionParser(description=__doc__)
parser.add_option(
    "-n", dest="n_respondents", default=100, type="int",
    help="number of survey respondents", 
)
opts, args = parser.parse_args()

# a bunch of common types of scales in surveys
scale1to10 = range(1,11)
yesno = ["No", "Yes"]
agreement = ["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]

# some sample questions
question_and_choice_list = [
    ("Do survey analysis tools make you want to barf?", scale1to10),
    ("Do you love the Excel blue, pink, ... color scheme?", yesno),
    ("Survey monkey is sweet", agreement),
    ("Google forms tells me everything I need to know.", agreement),
    ("You can't get any better (or cheaper) than a PB&J.", scale1to10),
    ("The lunch buffet is delicious.", scale1to10),
    ("Any Chipoltletized food is perfect for take-out.", scale1to10),
    ("Food trucks meet my criteria for culinary independence.", scale1to10),
    ("I need a tablecloth and Perrier to properly digest lunch.", scale1to10),
    # ("Gender", ["Male", "Female"]),
    # ("Age", ["<20", "extremely old"]),
    # ("Salary", ["$10/hr", "$30k/yr", "much more than that"]),
]

# generate a bunch of fake data, with 'odd' people having a slight
# preference for lower choices and 'even' people having a slight
# preference for higher choices
data = []
for i in xrange(opts.n_respondents):
    responses = {}
    for q_number, (question, choices) in enumerate(question_and_choice_list):
        n = int(0.7*len(choices))
        if i%2:
            choice = random.choice(choices[:n])
        else:
            choice = random.choice(choices[-n:])
        responses[q_number+1] = choice
    data.append(responses)

# write it out all purty in a useful javascript file for this example
print("var data = %s;" % json.dumps(data))
