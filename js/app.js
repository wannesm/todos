Todos = SC.Application.create({
  ready: function(){
    this._super();
    $.ajax('/todos.json', {
      success: function(data){
        Todos.todosController.beginPropertyChanges();
        data.forEach(function(item){
          item = item.todo;
          var todo = Todos.Todo.create({
            id: item.id,
            title: item.title,
            isDone: item.done
          });
          Todos.todosController.pushObject(todo);
        });
        Todos.todosController.endPropertyChanges();
      },
      error: function(response, status, error){
        console.error(status, error, response.responseText);
      }
    });
  }
});

Todos.Todo = SC.Object.extend({
  id: null,
  title: null,
  isDone: false,

  attributes: function(){
    return {
      title: this.get('title'),
      done: this.get('isDone')
    };
  }.property('title', 'isDone').cacheable(),

  isNew: function(){
    return !this.get('id');
  }.property('id').cacheable(),

  isDestroyed: false,

  isSaving: false,
  isDestroying: false,

  hasQueuedSave: false,
  hasQueuedDestroy: false,

  save: function(){
    if (this.get('isDestroying')) { return false; }

    if (this.get('isSaving')) {
      this.set('hasQueuedSave', true);
      return;
    }

    this.set('isSaving', true);
    this.set('hasQueuedSave', false);

    var self = this,
        url = this.get('isNew') ? '/todos.json' : '/todos/'+this.get('id')+'.json',
        method = this.get('isNew') ? 'POST' : 'PUT';

    $.ajax(url, {
      type: 'POST',
      data: { todo: this.get('attributes'), _method: method },
      dataType: 'text', // Sometimes we get an empty string that blows up as JSON
      success: function(data, response) {
        data = $.trim(data);
        if (data) { data = JSON.parse(data); }
        if (self.get('isNew')) { self.set('id', data['todo']['id']); }
      },
      error: function(response, status, error){
        console.error(status, error, response.responseText);
      },
      complete: function(){
        if (self.get('hasQueuedDestroy')) { self.destroy(); }
        else if (self.get('hasQueuedSave')) { self.save(); }
      }
    });
  },

  destroy: function(){
    if (this.get('isNew')) { this.set('isDestroyed', true); }
    if (this.get('isDestroyed') || this.get('isDestroying')) { return; }

    if (this.get('isSaving')) {
      this.set('hasQueuedDestroy', true);
      return;
    }

    this.set('isDestroying', true);
    this.set('hasQueuedDestroy', false);

    var self = this;

    $.ajax('/todos/'+this.get('id')+'.json', {
      type: 'POST',
      data: { _method: 'delete' },
      dataType: 'text', // Sometimes we get an empty string that blows up as JSON
      error: function(response, status, error){
        console.error(status, error, response.responseText);
      },
      success: function(){
        self.set('isDestroyed', true);
      }
    });
  },

  autosave: function(){
    this.save();
  }.observes('attributes')

});

Todos.todosController = SC.ArrayProxy.create({
  content: [],

  createTodo: function(title) {
    var todo = Todos.Todo.create({ title: title });
    this.pushObject(todo);
    todo.save();
  },

  clearCompletedTodos: function() {
    var self = this;
    this.filterProperty('isDone', true).forEach(function(todo){
      self.removeObject(todo);
      todo.destroy();
    });
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
    var value = this.get('value');

    if (value) {
      Todos.todosController.createTodo(value);
      this.set('value', '');
    }
  }
});

