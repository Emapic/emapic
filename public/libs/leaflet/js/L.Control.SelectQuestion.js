L.Control.SelectQuestion = L.Control.extend({
	options: {
		collapsed: false,
		position: 'topright',
		autoZIndex: true
	},

	initialize: function (questions, options) {
		L.setOptions(this, options);

		this._questions = {};
		this._handlingClick = false;
		this._questions = questions;
	},

	onAdd: function (map) {
		this._initLayout();
		this._update();

		return this._container;
	},

	_expand: function () {
		//L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
	},

  _initLayout: function () {
    var className = 'leaflet-control select question-selector'
    var container = this._container = L.DomUtil.create('div', className)

    L.DomEvent.disableClickPropagation(container);
    if (!L.Browser.touch) {
      L.DomEvent.on(container, 'mousewheel', L.DomEvent.stopPropagation)
    }

    if (this.options.collapsed) {
      var link = this._questionsLink = L.DomUtil.create('a', className + '-toggle', container)
      link.href = '#'
      link.title = 'Layers'

      if (L.Browser.touch) {
        L.DomEvent
          .on(link, 'click', L.DomEvent.stopPropagation)
          .on(link, 'click', L.DomEvent.preventDefault)
          .on(link, 'click', this._expand, this)
      } else {
        L.DomEvent
          .on(container, 'mouseover', this._expand, this)
          .on(container, 'mouseout', this._collapse, this)
        L.DomEvent.on(link, 'focus', this._expand, this)
      }

      this._map.on('movestart', this._collapse, this)
    } else {
      this._expand()
    }
  },

	_update: function () {
		if (!this._container) {
			return;
		}

		this._questionsSelect = L.DomUtil.create('select', 'show-small');
		this._questionsSelect.onchange = this._onQuestionOptionChange;

		this._questionsList = L.DomUtil.create('ul', 'dropdown-menu dropdown-menu-right option');
		this._questionsList.setAttribute('role', 'menu');

		for (i in this._questions) {
			obj = {
				text: this._questions[i],
				value: i
			};
			this._addOptionItem(obj);
			this._addLiItem(obj);
		}


		this._container.innerHTML += '<button type="button" class="btn btn-default dropdown-toggle hide-small" data-toggle="dropdown" aria-expanded="false"><span id="1" class="selected" style="float: left;">' + this._questions[0] + '</span> <span class="caret"></span></button>';
		this._container.appendChild(this._questionsList);
		this._container.appendChild(this._questionsSelect);
		
	}

  ,_onQuestionOptionChange: function (e) {
	  var val = e.target.value;
	  var text = $(e.target).find('option:selected').text()
	  $('#vote-chart-title').text(text);
	  $('.leaflet-control.question-selector button span.selected').text(text);
	  changeActiveLegend('color', val);
  }

  ,_onQuestionLiChange: function (e) {
      var val = e.target.parentElement.id;
      $('.leaflet-control.question-selector select').val(val).change();
  }

  ,_addLiItem: function (obj) {
    var option = this._createLiElement(obj)
    this._questionsList.appendChild(option);
  }

  ,_createLiElement: function (obj) {
    var option = L.DomUtil.create('li');
    option.setAttribute('id', obj.value);
    option.setAttribute('txt', obj.text);
    option.onclick = this._onQuestionLiChange;
    option.innerHTML = '<a href="#">' + obj.text + '</a>';
    return option
  }

  ,_addOptionItem: function (obj) {
    var option = this._createOptionElement(obj)
    this._questionsSelect.appendChild(option);
  }

  ,_createOptionElement: function (obj) {
    var option = L.DomUtil.create('option');
    option.setAttribute('value', obj.value);
    option.innerHTML = obj.text;
    return option
  }

  ,_collapse: function (e) {
    if (e.target === this._container) {
      L.Control.Layers.prototype._collapse.apply(this, arguments)
    }
  }

})

L.control.selectQuestion = function (questions, options) {
  return new L.Control.SelectQuestion(questions, options)
}
