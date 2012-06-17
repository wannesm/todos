// Naive Bayes implementation
// 
// Based on Programming Collective Intelligence, Toby Segaran, O'Reilly, 2007.
// 
// Copyright 2011, Wannes Meert, KULeuven

/**
 * Naive Bayes class
 */
function NaiveBayes() {}
NaiveBayes.prototype = {

	// Counts of word/tag combination
	// e.g., {'buy': {'shop':1, 'work':0}, 'pens': {'shop':1, 'work':1}}
	wt: {},
	// Counts of todos in each tag
	ct: {},
	// Tags in classifier
	tagsnb: [],
	// default weight
	weight: 1.0,
	// default ap
	ap: 0.5,

	tagProbs: function(todo) {
		probs = [];
		for (var i=0; i<this.tagsnb.length; i++) {
			probs.push({
				tag: this.tagsnb[i],
				probability: this.tagProbGivenTodo(todo, this.tagsnb[i])
			})
		}
		return probs;
	},

	/**
	 * Pr( todo | tag )
	 */
	todoProbGivenTag: function(todo, tag) {
		words = tokenize(todo);
		p = 1;
		for (var i=0; i<words.length; i++) {
			p *= this.weightedprob(words[i], tag);
		}
		return p;
	},

	/**
	 * ~ Pr( tag | todo )
	 *
	 * Not normalized.
	 */
	tagProbGivenTodo: function(todo, tag) {
		tagprob = this.tagcount(tag) / this.totalcount();
		todoprob = this.todoProbGivenTag(todo, tag);
		return todoprob*tagprob;
	},
	
	incw : function(word, tag) {
		if (this.tagsnb.indexOf(tag) == -1)
			this.tagsnb.push(tag)
		if (this.wt[word] == undefined)
			this.wt[word] = {};
		if (this.wt[word][tag] == undefined)
			this.wt[word][tag] = 0;
		this.wt[word][tag] += 1
	},
	
	inct : function(tag) {
		if (this.ct[tag] == undefined) {
			this.ct[tag] = 0;
			if (this.tagsnb.indexOf(tag) == -1 )
				this.tagsnb.push(tag);
		}
		this.ct[tag] += 1
	},

	wordcount: function(word, tag) {
		if (this.wt[word] == undefined)
			return 0.0
		if (this.wt[word][tag] == undefined)
			return 0.0
		return this.wt[word][tag]
	},

	tagcount: function(tag) {
		if (this.ct[tag] == undefined)
			return 0
		return this.ct[tag]
	},

	totalcount: function() {
		sum = 0
		for (var i=0; i<this.tagsnb.length; i++)
			sum += this.ct[this.tagsnb[i]]
		return sum
	},

	train: function(todo, tag) {
		words = tokenize(todo)
		for (var i=0; i<words.length; i++) {
			this.incw(words[i], tag)
		}
		this.inct(tag)
	},

	/**
	 * Prob( word | tag )
	 */
	wordprob: function(word,tag) {
		if (this.tagcount(tag) == 0)
			return 0.0;
		return this.wordcount(word,tag) / this.tagcount(tag)
	},

	weightedprob: function(word, tag) {
		basicprob = this.wordprob(word, tag);
		totals = 0;
		for (var i=0; i<this.tagsnb.length; i++) {
			totals += this.wordcount(word, this.tagsnb[i])
		}
		return ((this.weight*this.ap)+(totals*basicprob))/(this.weight+totals);
	},

	print: function() {
		console.log("wt:");
		console.log(this.wt);
		console.log("ct:");
		console.log(this.ct);
		console.log("tagsnb:");
		console.log(this.tagsnb);
	}
};

var naivebayes = new NaiveBayes();

//function sampletrain() {
	//naivebayes.train('Nobody owns the water.','good')
	//naivebayes.train('the quick rabbit jumps fences','good')
	//naivebayes.train('buy pharmaceuticals now','bad')
	//naivebayes.train('make quick money at the online casino','bad')
	//naivebayes.train('the quick brown fox jumps','good')
//}

function teachTodo(tag, todo) {
	console.log("Learning tag "+tag+" for todo "+todo);
	naivebayes.train(todo, tag);
}

function guessTags(todo) {
	console.log("Guessing for todo "+todo);
	probs = naivebayes.tagProbs(todo);
	sumprob = 0;
	for (var i=0; i<probs.length; i++) {
		sumprob += probs[i].probability;
	}
	for (var i=0; i<probs.length; i++) {
		probs[i].probability /= sumprob;
	}
	return probs;
}

function tokenize(todo) {
	todo2 = new String(todo);
	todo2 = todo2.toLowerCase();
	todo2 = todo2.replace(/\s+/g,' ');
	return todo2.split(" ");
}
