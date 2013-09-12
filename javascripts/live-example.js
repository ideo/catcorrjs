// http://dataist.wordpress.com/2012/11/23/using-google-spreadsheet-as-a-database/
d3.csv("https://docs.google.com/spreadsheet/pub?key=0AiojUCBHn7gJdGVHMVlubGxLbjNEOGZqdjBGX0l6THc&output=csv", function (error, rows) {

    var data = {responses: [], questions: [
	{number: 1, type: "outcome", text: "Which came first?", choices: ["Chicken", "Egg"]},
	{number: 2, type: "outcome", text: "Do you hit the snooze button?", choices: ["No", "Yes"]},
	{number: 3, type: "outcome", text: "If I was a zombie, I would...", choices: ["preferentially chase small children.", "seek out police officers and others with shotguns.", "learn to drive stick."]},
	{number: 4, type: "outcome", text: "What is your favorite day of the week?", choices: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]},
	{number: 5, type: "demographic", text: "Gender", choices: ["Male", "Female"]},
	{number: 6, type: "demographic", text: "Age", choices: ["Teenie bopper", "20-something", "Parent age", "Grandparent age"]},
    ]};
    rows.forEach(function (r) {
	var response = {};
	data.responses.push(response);
	data.questions.forEach(function (q) {
	    response[q.number] = r[q.text];
	});
    });

    var cc = catcorr("#example", data);

});