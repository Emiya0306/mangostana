const mongoose = require('mongoose')
const pluralize = require('pluralize')
const Schema = mongoose.Schema

class Mangostana {
    constructor () {
        this.models = {}
        this.schemas = {}
        this.mappings = {}

        mongoose.Promise = global.Promise
    }

    connect (connectString) {
        mongoose.connect(connectString)
    }

    createModel (modelName, schema) {
        this._createMongooseSchema(modelName, schema)
        this._createMongooseModel(modelName)

        return this.models[modelName]
    }

    _createMongooseSchema (modelName, schema) {
        this.schemas[modelName] = new Schema(schema, {timestamps: true})
        this.schemas[modelName].method('link', this._addLinkMethod)
        this.schemas[modelName].method('unlink', this._addUnlinkMethod)
    }

    _createMongooseModel (modelName) {
        this.models[modelName] = mongoose.model(modelName, this.schemas[modelName])
    }

    _addLinkMethod (linkedModel) {
        const self = getMangostana(), that = linkedModel

        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(that.collection.name, 1)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        if (!self.mappings[mappingName]) {
            self.mappings[mappingName] = self.createModel(mappingName, {
                [`${thisModelName}Id`]: Schema.Types.ObjectId,
                [`${thatModelName}Id`]: Schema.Types.ObjectId
            })
        }

        const mapping = new self.mappings[mappingName]({
            [`${thisModelName}Id`]: this._id,
            [`${thatModelName}Id`]: that._id
        })

        return mapping.save()
    }

    _generateMappingName (thisCollectionName, thatCollectionName) {
        return thisCollectionName.toLowerCase() > thatCollectionName.toLowerCase() ?
            `${thatCollectionName}-${thisCollectionName}` :
            `${thisCollectionName}-${thatCollectionName}`
    }

    _addUnlinkMethod (linkedModel) {
        const self = getMangostana(), that = linkedModel

        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(that.collection.name, 1)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        if (!self.mappings[mappingName]) {
            self.mappings[mappingName] = self.createModel(mappingName, {
                [`${thisModelName}Id`]: Schema.Types.ObjectId,
                [`${thatModelName}Id`]: Schema.Types.ObjectId
            })
        }

        return self.mappings[mappingName].findOneAndRemove({
            [`${thisModelName}Id`]: this._id,
            [`${thatModelName}Id`]: that._id
        })
    }
}

function getMangostana () {
    return self
}

var self = module.exports = new Mangostana()