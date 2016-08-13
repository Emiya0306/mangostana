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

    /**
     *
     * @param modelName
     * @param schema
     * @param options
     * @returns {*}
     */
    createModel (modelName, schema, options) {
        this._createMongooseSchema(modelName, schema, options)
        this._createMongooseModel(modelName)

        return this.models[modelName]
    }

    /**
     *
     * @param modelName
     * @param schema
     * @param options
     * @private
     */
    _createMongooseSchema (modelName, schema, options) {
        this.schemas[modelName] = new Schema(schema, options || {timestamps: true})
        this.schemas[modelName].method('link', this._addLinkMethod)
        this.schemas[modelName].method('unlink', this._addUnlinkMethod)
        this.schemas[modelName].method('getRelation', this._addGetRelationMethod)
    }

    /**
     *
     * @param modelName
     * @private
     */
    _createMongooseModel (modelName) {
        this.models[modelName] = mongoose.model(modelName, this.schemas[modelName])
    }

    /**
     *
     * @param thisCollectionName
     * @param thatCollectionName
     * @returns {*}
     * @private
     */
    _generateMappingName (thisCollectionName, thatCollectionName) {
        return thisCollectionName.toLowerCase() > thatCollectionName.toLowerCase() ?
            `${thatCollectionName}-${thisCollectionName}` :
            `${thisCollectionName}-${thatCollectionName}`
    }

    /**
     *
     * @param linkedModel
     * @returns {Promise|*}
     * @private
     */
    _addLinkMethod (linkedModel) {
        const self = getMangostana(), that = linkedModel

        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(that.collection.name, 1)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        if (!self.mappings[mappingName]) {
            self.mappings[mappingName] = self.createModel(mappingName, {
                [`${thisModelName}Id`]: Schema.Types.ObjectId,
                [`${thatModelName}Id`]: Schema.Types.ObjectId
            }, {collection: mappingName})
        }

        const mapping = new self.mappings[mappingName]({
            [`${thisModelName}Id`]: this._id,
            [`${thatModelName}Id`]: that._id
        })

        return mapping.save()
    }

    /**
     *
     * @param linkedModel
     * @returns {*|Query}
     * @private
     */
    _addUnlinkMethod (linkedModel) {
        const self = getMangostana(), that = linkedModel

        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(that.collection.name, 1)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        if (!self.mappings[mappingName]) {
            self.mappings[mappingName] = self.createModel(mappingName, {
                [`${thisModelName}Id`]: Schema.Types.ObjectId,
                [`${thatModelName}Id`]: Schema.Types.ObjectId
            }, {collection: mappingName})
        }

        return self.mappings[mappingName].findOneAndRemove({
            [`${thisModelName}Id`]: this._id,
            [`${thatModelName}Id`]: that._id
        })
    }

    _addGetRelationMethod (modelName, queryOpts) {
        const self = getMangostana()
        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(modelName, 1)
        const query = self._generateQuery(queryOpts, thatModelName)

        if (!self.models[thatModelName]) return null

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        let mapping

        if (!self.mappings[mappingName]) {
            mapping = self.createModel(mappingName, {
                [`${thisModelName}Id`]: Schema.Types.ObjectId,
                [`${thatModelName}Id`]: Schema.Types.ObjectId
            }, {collection: mappingName})
        } else {
            mapping = self.mappings[mappingName]
        }

        return mapping.aggregate(
            // get the all the linked model mappings
            {$match: {[`${thisModelName}Id`]: this._id}},
            // lookup the documents from linked collection
            {$lookup: {from: modelName, localField: `${thatModelName}Id`, foreignField: '_id', as: thatModelName}},
            // resolve the lookup array of thatModel
            {$unwind: `$${thatModelName}`},
            // add additional query of customer
            {$match: query},
            // group the documents together
            {$group: {_id: `$${thisModelName}Id`, [thatModelName]: {$addToSet: `$${thatModelName}`}}}
            // group has 100 MB of RAM, allowDiskUse can write data to temporary files
        )
            .allowDiskUse(true)
            .then((result) => {
                return result[0][thatModelName]
            })
    }

    _generateQuery (queryOpts = {}, thatModelName) {
        let query = {}

        for (const key in queryOpts) {
            if(queryOpts.hasOwnProperty(key)) {
                Object.assign(query, {[`${thatModelName}.${key}`]: `${queryOpts[key]}`})
            }
        }

        return query
    }
}

function getMangostana () {
    return self
}

var self = module.exports = new Mangostana()