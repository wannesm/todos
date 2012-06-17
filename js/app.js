Todos = SC.Application.create({
	ready: function() {
		this._super();

		// Predefined tags
		//Todos.tagsController.createTag("winkel");
		//Todos.tagsController.createTag("werk");
		//Todos.tagsController.createTag("sport");

		// Training
		Todos.tagsController.learnFromTodo("Buy eggs #shop");
		Todos.tagsController.learnFromTodo("Buy milk #shop");
		Todos.tagsController.learnFromTodo("Buy bread #shop");
		Todos.tagsController.learnFromTodo("Buy flower #shop");
		Todos.tagsController.learnFromTodo("Write paper #work");
		Todos.tagsController.learnFromTodo("Write proposal #work");
		Todos.tagsController.learnFromTodo("Implement prototype #work");
		Todos.tagsController.learnFromTodo("Meeting with prof Blockeel #work #urgent");
		Todos.tagsController.learnFromTodo("Buy climbing card #sport");
		Todos.tagsController.learnFromTodo("Agree on a day to go climbing #sport");
	}
});

Todos.Todo = SC.Object.extend({
  title: null,
  isDone: false
});

Todos.Tag = SC.Object.extend({
	name: null,
	confidence: 0,

	isRecommended: function() {
		if (this.confidence > 0.8) return true;
		else return false;
	}.property('confidence')
});

Todos.tagsController = SC.ArrayProxy.create({
	content: [],
	todoString: null,

	createTag: function(name) {
		if (this.content.filter( function(item) {if (item.name == name) return true;} ).length != 0) {
			console.log("Tag "+name+" already exists")
			return;
		}
		var tag = Todos.Tag.create({ name: name });
		this.pushObject(tag)
		this.sortConfidence()
		//this.notifyPropertyChange('content')
	},

	learnFromTodo: function(todo) {
		console.log("Learn from todo: "+todo)
		words = todo.split(" ")
		tags = []
		for (var i=0; i<words.length; i++) {
			word = words[i]
			if (word[0] == "#") {
				// it's a tag
				tags.push(word.substr(1))
			}
		}
		newtodo = todo.replace(/#[a-zA-Z]+/i, "")
		for (var i=0; i<tags.length; i++) {
			this.createTag(tags[i])
			teachTodo(tags[i], newtodo)
		}
	},

	updateTagsConfidence: function() {
		console.log("Update confidences")

		filteredTodoString = this.todoString.replace(/#[a-zA-Z]+/i, "")
		//console.log("filtered todo = "+filteredTodoString)
		tagsprobs = guessTags(filteredTodoString)
		//console.log(tagsprobs);
		thiscontent = this.content

		this.content.forEach( function(ctag, index, self) {
			tagsprob = tagsprobs.find( function(curtagsprob) {
				return ctag.name == curtagsprob.tag
			})
			if (tagsprob == null) {
				console.log("Tag not yet learned by naive bayes: "+ctag.name)
			} else {
				//console.log("Tag found: "+ctag.name+", old prob: "+ctag.confidence+", new prob: "+tagsprob.probability)
				ctag.set('confidence', tagsprob.probability)
			}
		})
		this.sortConfidence()
		this.notifyPropertyChange("content");

	}.observes("todoString"),

	// Example usage:
	// Todos.tagsController.setTagConfidence("winkel",0.9)
	setTagConfidence: function(name, conf) {
		this.content.forEach( function(item, index, self) {
			if (item.name == name) {
				console.log("Updating "+name+" to confidence "+conf);
				item.set('confidence', conf)
			}
		})
		this.sortConfidence()
		this.notifyPropertyChange("content");
	},

	sortConfidence: function() {
		this.content.sort(function(a,b) {
			if (a.confidence == b.confidence) {
				return a.name.localeCompare(b.name)
			} else {
				if (a.confidence < b.confidence) return 1
				else return -1
			}
		});
		//this.notifyPropertyChange("content");
	},//.observes("@each.confidence"),

	print: function() {
		this.content.forEach(function(item) {
			console.log(item.name+" - "+item.confidence)
		})
	}
});


Todos.tagsControllerFiltered = SC.ArrayProxy.create({
	content: [],

	update: function() {
		console.log("Update shown tags");
		//this.content.forEach(function(item) {
			//console.log(item.name +" "+item.confidence)
		//})
		if (Todos.tagsController.todoString == null || Todos.tagsController.todoString == "") {
			this.set("content",[])
		} else {
			this.set("content",Todos.tagsController.filter(
				function(item, index, self) {
					if (Todos.tagsController.todoString != null && Todos.tagsController.todoString.search("#"+item.name) != -1) {
						console.log("Not showing tag "+item.name)
						return false
					}
					if(item.confidence < 0.0) { return false; }
					return true;
				}
			))
		}
	}.observes("Todos.tagsController.content"),

	print: function() {
		this.content.forEach(function(item) {
			console.log(item.name+" - "+item.confidence)
		})
	}
});


Todos.tagsCollectionView = SC.CollectionView.extend({
	itemViewClass: SC.View.extend({
		mouseDown: function(evt) {
			console.log("Clicked on tag: "+this.content.name);
			oldval = $('#new-todo').val();
			//console.log("Old input field value: "+oldval);
			$('#new-todo').val(oldval+" #"+this.content.name)
		}
	})
});

Todos.todosController = SC.ArrayProxy.create({
  content: [],

  createTodo: function(title) {
    var todo = Todos.Todo.create({ title: title });
    this.pushObject(todo);
  },

  clearCompletedTodos: function() {
    this.filterProperty('isDone', true).forEach(this.removeObject, this);
  },

  remaining: function() {
    return this.filterProperty('isDone', false).get('length');
  }.property('@each.isDone'),

  allAreDone: function(key, value) {
    if (value !== undefined) {
      this.setEach('isDone', value);

      return value;
    } else {
      return !!this.get('length') && this.everyProperty('isDone', true);
    }
  }.property('@each.isDone')
});

Todos.StatsView = SC.View.extend({
  remainingBinding: 'Todos.todosController.remaining',

  remainingString: function() {
    var remaining = this.get('remaining');
    return remaining + (remaining === 1 ? " item" : " items");
  }.property('remaining')
});

Todos.CreateTodoView = SC.TextField.extend({
  insertNewline: function() {
	  console.log("Adding new todo")
    //var value = this.get('value');
	var value = Todos.tagsController.get("todoString")

    if (value) {
		//Todos.tagsController.set("todoString", "")
	  this.set('value', '');
      Todos.todosController.createTodo(value);
	  Todos.tagsController.learnFromTodo(value)
	  console.log("Learned tags in todo")
    }
  }
});

