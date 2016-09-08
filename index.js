'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pluralize = require('pluralize');

var self;

var MappingQuery = function () {
    function MappingQuery(thisModel, thatModel, action) {
        _classCallCheck(this, MappingQuery);

        this.action = action;
        this.thisModel = thisModel;
        this.thatModel = thatModel;

        this.thisModelName = pluralize.singular(thisModel.collection.name, 1);
        this.thatModelName = pluralize.singular(thatModel.collection.name, 1);

        this.thatModelName = this.thisModelName == this.thatModelName ? this.thatModelName + 'Duplicate' : this.thatModelName;
    }

    _createClass(MappingQuery, [{
        key: 'as',
        value: function as(relationName, bothRelation) {
            var _ref;

            var thatModelName = this.thatModelName.replace('Duplicate', '');
            relationName = pluralize.singular(relationName.toLowerCase(), 1);
            this.thatModelName = relationName;

            var mappingName = relationName + 'Mapping';
            var Mapping = this.generateMappingModel(mappingName, true);

            var relations = [];

            relations.push(new Mapping((_ref = {}, _defineProperty(_ref, this.thisModelName + 'Id', this.thisModel._id), _defineProperty(_ref, this.thatModelName + 'Id', this.thatModel._id), _defineProperty(_ref, this.thatModelName + 'Type', thatModelName), _ref)));

            if (bothRelation) {
                var _ref2;

                relations.push(new Mapping((_ref2 = {}, _defineProperty(_ref2, this.thisModelName + 'Id', this.thatModel._id), _defineProperty(_ref2, this.thatModelName + 'Id', this.thisModel._id), _defineProperty(_ref2, this.thatModelName + 'Type', thatModelName), _ref2)));
            }

            return Promise.all(relations.map(function (relation) {
                return relation.save();
            }));
        }
    }, {
        key: 'then',
        value: function then(resolve, reject) {
            return this.generatePromise().then(resolve, reject);
        }
    }, {
        key: 'catch',
        value: function _catch(reject) {
            return this.generatePromise().then(null, reject);
        }
    }, {
        key: 'generatePromise',
        value: function generatePromise() {
            var _ref3, _Mapping$findOneAndRe;

            var action = void 0;

            var mappingName = generateMappingName(this.thisModelName, this.thatModelName);
            var Mapping = this.generateMappingModel(mappingName);

            switch (this.action) {
                case 'link':
                    action = new Mapping((_ref3 = {}, _defineProperty(_ref3, this.thisModelName + 'Id', this.thisModel._id), _defineProperty(_ref3, this.thatModelName + 'Id', this.thatModel._id), _ref3)).save();
                    break;

                case 'unlink':
                    action = Mapping.findOneAndRemove((_Mapping$findOneAndRe = {}, _defineProperty(_Mapping$findOneAndRe, this.thisModelName + 'Id', this.thisModel._id), _defineProperty(_Mapping$findOneAndRe, this.thatModelName + 'Id', this.thatModel._id), _Mapping$findOneAndRe));
                    break;

                default:
                    throw new Error('Unsupport action type on MappingQuery');
                    break;
            }
            return action;
        }
    }, {
        key: 'generateMappingModel',
        value: function generateMappingModel(mappingName, hasType) {
            var hasMapping = checkMappingExisted(mappingName);

            if (hasMapping) {
                return self.mongoose.models[mappingName];
            } else {
                var _schema;

                var schema = (_schema = {}, _defineProperty(_schema, this.thisModelName + 'Id', self.Schema.Types.ObjectId), _defineProperty(_schema, this.thatModelName + 'Id', self.Schema.Types.ObjectId), _schema);

                if (hasType) {
                    schema[this.thatModelName + 'Type'] = String;
                }

                var mappingSchema = new self.Schema(schema, { collection: mappingName });

                return self.mongoose.model(mappingName, mappingSchema);
            }
        }
    }]);

    return MappingQuery;
}();

var RelationQuery = function () {
    function RelationQuery(targetModel, relationship, queryOpts) {
        var _mappingSchema;

        _classCallCheck(this, RelationQuery);

        this.targetModel = targetModel;
        this.thisModelName = pluralize.singular(targetModel.collection.name, 1);
        this.thatModelName = pluralize.singular(relationship.toLowerCase(), 1);
        this.relatedCollectionName = pluralize.plural(relationship.toLowerCase(), 4);
        this.query = self._generateQuery(queryOpts, this.thatModelName);

        this.mappingName = this.isModelExisted(this.thatModelName) !== -1 ? generateMappingName(this.thisModelName, this.thatModelName) : this.thatModelName + 'Mapping';

        var hasMapping = checkMappingExisted(this.mappingName);
        this.relationMapping = this.isRelationMapping(this.mappingName);

        var mappingSchema = (_mappingSchema = {}, _defineProperty(_mappingSchema, this.thisModelName + 'Id', self.Schema.Types.ObjectId), _defineProperty(_mappingSchema, this.thatModelName + 'Id', self.Schema.Types.ObjectId), _mappingSchema);

        if (this.relationMapping) {
            mappingSchema[this.thatModelName + 'Type'] = String;
        }

        mappingSchema = new self.Schema(mappingSchema, { collection: this.mappingName });

        this.Mapping = hasMapping ? self.mongoose.models[this.mappingName] : self.mongoose.model(this.mappingName, mappingSchema);
    }

    _createClass(RelationQuery, [{
        key: 'isRelationMapping',
        value: function isRelationMapping(mappingName) {
            return mappingName.indexOf('Mapping') !== -1;
        }
    }, {
        key: 'with',
        value: function _with() {}
    }, {
        key: 'isModelExisted',
        value: function isModelExisted(modelName) {
            return Object.keys(self.mongoose.models).indexOf(modelName);
        }
    }, {
        key: 'generateAggregate',
        value: function generateAggregate() {
            var _this = this;

            return this.Mapping.findOne(_defineProperty({}, this.thisModelName + 'Id', this.targetModel._id)).then(function (mapping) {
                if (!mapping) return [];

                var collectionName = _this.relationMapping ? pluralize.plural(mapping[_this.thatModelName + 'Type'], 4) : _this.relatedCollectionName;

                return _this.Mapping.aggregate(
                // get the all the linked model mappings
                { $match: _defineProperty({}, _this.thisModelName + 'Id', _this.targetModel._id) },
                // lookup the documents from linked collection
                { $lookup: { from: collectionName, localField: _this.thatModelName + 'Id', foreignField: '_id', as: _this.thatModelName } },
                // resolve the lookup array of thatModel
                { $unwind: '$' + _this.thatModelName },
                // add additional query of customer
                { $match: _this.query },
                // group the documents together
                { $group: _defineProperty({ _id: '$' + _this.thisModelName + 'Id' }, _this.thatModelName, { $addToSet: '$' + _this.thatModelName }) })
                // group has 100 MB of RAM, allowDiskUse can write data to temporary files
                .allowDiskUse(true).then(function (result) {
                    if (result.length !== 0) {
                        return result[0][_this.thatModelName];
                    } else {
                        return [];
                    }
                });
            });
        }
    }, {
        key: 'then',
        value: function then(resolve, reject) {
            return this.generateAggregate().then(resolve, reject);
        }
    }, {
        key: 'catch',
        value: function _catch(reject) {
            return this.generateAggregate().then(null, reject);
        }
    }]);

    return RelationQuery;
}();

var Mangostana = function () {
    function Mangostana(mongoose) {
        _classCallCheck(this, Mangostana);

        this.mongoose = mongoose;
        this.Schema = mongoose.Schema;
        this.models = mongoose.models;

        mongoose.Promise = global.Promise;
        mongoose.plugin(this.enhanceSchema.bind(this));
    }

    _createClass(Mangostana, [{
        key: 'enhanceSchema',
        value: function enhanceSchema(schema) {
            schema.method('link', this.link);
            schema.method('unlink', this.unlink);
            schema.method('getRelation', this.getRelation);
        }
    }, {
        key: 'link',
        value: function link(that) {
            return new MappingQuery(this, that, 'link');
        }
    }, {
        key: 'unlink',
        value: function unlink(that) {
            return new MappingQuery(this, that, 'unlink');
        }
    }, {
        key: 'getRelation',
        value: function getRelation(modelName, queryOpts) {
            return new RelationQuery(this, modelName, queryOpts);
        }
    }, {
        key: '_generateQuery',
        value: function _generateQuery() {
            var queryOpts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
            var thatModelName = arguments[1];

            var query = {};

            for (var key in queryOpts) {
                if (queryOpts.hasOwnProperty(key)) {
                    Object.assign(query, _defineProperty({}, thatModelName + '.' + key, '' + queryOpts[key]));
                }
            }

            return query;
        }
    }]);

    return Mangostana;
}();

function generateMappingName(thisCollectionName, thatCollectionName) {
    return thisCollectionName.toLowerCase() > thatCollectionName.toLowerCase() ? thatCollectionName + '-' + thisCollectionName : thisCollectionName + '-' + thatCollectionName;
}

function checkMappingExisted(mappingName) {
    var hasMapping = false;

    var modelsName = Object.keys(self.models);

    modelsName.forEach(function (modelName) {
        if (modelName.toLowerCase() === mappingName.toLowerCase()) {
            hasMapping = true;
        }
    });

    return hasMapping;
}

function mangostana(mongoose) {
    return self = new Mangostana(mongoose);
}

module.exports = mangostana;
