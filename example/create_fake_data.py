#!/usr/bin/env python

"""quick 'n dirty script to create a fake data set from a hypothetical
survey asking the stereotypical categorical questions.
"""

import json
import random
import optparse

parser = optparse.OptionParser(description=__doc__)
parser.add_option(
    "-n", dest="nice_respondents", default=100, type="int",
    help="number of survey respondents that try to answer questions", 
)
parser.add_option(
    "-a", dest="asshole_respondents", default=10, type="int",
    help="number of assholes that try to finish as quickly as possible", 
)
opts, args = parser.parse_args()

# a bunch of common types of scales in surveys
scale1to10 = range(1,11)
yesno = ["No", "Yes"]
agreement = ["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]

# some sample questions
question_and_choice_list = [
    
    # type, text, choices
    ("outcome", "Do survey analysis tools make you want to barf?", scale1to10),
    ("outcome", "Do you love the Excel blue, pink, ... color scheme?", yesno),
    ("outcome", "Survey monkey is sweet", agreement),
    ("outcome", "Google forms tells me everything I need to know.", agreement),
    ("outcome", "You can't get any better (or cheaper) than a PB&J.", scale1to10),
    ("outcome", "The lunch buffet is delicious.", scale1to10),
    ("outcome", "Any Chipoltletized food is perfect for take-out.", scale1to10),
    ("outcome", "Food trucks meet my criteria for culinary independence.", scale1to10),
    ("outcome", "I need a tablecloth and Perrier to properly digest lunch.", scale1to10),
    ("demographic", "Gender", ["Male", "Female"]),
    ("demographic", "Age", ["<20", "extremely old"]),
    ("demographic", "Salary", ["$10/hr", "$30k/yr", "much more than that"]),
]

questions = []
for i, q in enumerate(question_and_choice_list):
    questions.append(
        {"number": i+1, "type":q[0], "text": q[1], "choices": q[2]}
    )

# generate a bunch of fake data, with 'odd' people having a slight
# preference for lower choices and 'even' people having a slight
# preference for higher choices
response_list = []
for i in xrange(opts.nice_respondents):
    response = {}
    for q_number, (t,question, choices) in enumerate(question_and_choice_list):
        n = int(0.7*len(choices))
        if i%2:
            choice = random.choice(choices[:n])
        else:
            choice = random.choice(choices[-n:])
        response[q_number+1] = choice
    response_list.append(response)

# these jerks just click on the first thing they see to finish as
# quickly as possible
for i in xrange(opts.asshole_respondents):
    response = {}
    for q_number, (t,question, choices) in enumerate(question_and_choice_list):
        response[q_number+1] = choices[0]
    response_list.append(response)

# write it out all purty in a useful javascript file for this example
data = {
    "responses": response_list,
    "questions": questions,
}
print("var data_json = %s;" % json.dumps(data))
