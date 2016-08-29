const pluralize = require('pluralize')

var self

class Mangostana {
    constructor (mongoose) {
        this.mongoose = mongoose
        this.Schema = mongoose.Schema
        this.models = mongoose.models

        mongoose.Promise = global.Promise
        mongoose.plugin(this.enhanceSchema.bind(this))
    }

    enhanceSchema (schema) {
        schema.method('link', this.link)
        schema.method('unlink', this.unlink)
        schema.method('getRelation', this.getRelation)
    }

    link (that) {
        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(that.collection.name, 1)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        const hasMapping = self.checkMapping(mappingName)

        const mappingSchema = new self.Schema({
            [`${thisModelName}Id`]: self.Schema.Types.ObjectId,
            [`${thatModelName}Id`]: self.Schema.Types.ObjectId
        }, {collection: mappingName})

        const Mapping = hasMapping ? self.mongoose.models[mappingName] : self.mongoose.model(mappingName, mappingSchema)

        const mapping = new Mapping({
            [`${thisModelName}Id`]: this._id,
            [`${thatModelName}Id`]: that._id
        })

        return mapping.save()
    }

    unlink (that) {
        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(that.collection.name, 1)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        const hasMapping = self.checkMapping(mappingName)

        const mappingSchema = new self.Schema({
            [`${thisModelName}Id`]: self.Schema.Types.ObjectId,
            [`${thatModelName}Id`]: self.Schema.Types.ObjectId
        }, {collection: mappingName})

        const Mapping = hasMapping ? self.mongoose.models[mappingName] : self.mongoose.model(mappingName, mappingSchema)

        return Mapping.findOneAndRemove({
            [`${thisModelName}Id`]: this._id,
            [`${thatModelName}Id`]: that._id
        })
    }

    getRelation (modelName, queryOpts) {
        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(modelName.toLowerCase(), 1)
        const relatedCollectionName = pluralize.plural(modelName.toLowerCase(), 4)
        const query = self._generateQuery(queryOpts, thatModelName)

        const mappingName = self._generateMappingName(thisModelName, thatModelName)

        const hasMapping = self.checkMapping(mappingName)

        const mappingSchema = new self.Schema({
            [`${thisModelName}Id`]: self.Schema.Types.ObjectId,
            [`${thatModelName}Id`]: self.Schema.Types.ObjectId
        }, {collection: mappingName})

        const Mapping = hasMapping ? self.mongoose.models[mappingName] : self.mongoose.model(mappingName, mappingSchema)

        return Mapping.aggregate(
            // get the all the linked model mappings
            {$match: {[`${thisModelName}Id`]: this._id}},
            // lookup the documents from linked collection
            {$lookup: {from: relatedCollectionName, localField: `${thatModelName}Id`, foreignField: '_id', as: thatModelName}},
            // resolve the lookup array of thatModel
            {$unwind: `$${thatModelName}`},
            // add additional query of customer
            {$match: query},
            // group the documents together
            {$group: {_id: `$${thisModelName}Id`, [thatModelName]: {$addToSet: `$${thatModelName}`}}}
        )
            // group has 100 MB of RAM, allowDiskUse can write data to temporary files
            .allowDiskUse(true)
            .then((result) => {
                if (result.length !== 0) {
                    return result[0][thatModelName]
                } else {
                    return []
                }
            })
    }

    checkMapping (mappingName) {
        let hasMapping = false

        const modelsName = Object.keys(self.models)

        modelsName.forEach((modelName) => {
            if (modelName.toLowerCase() === mappingName) {
                hasMapping = true
            }
        })
        return hasMapping
    }

    _generateMappingName (thisCollectionName, thatCollectionName) {
        return thisCollectionName.toLowerCase() > thatCollectionName.toLowerCase() ?
            `${thatCollectionName}-${thisCollectionName}` :
            `${thisCollectionName}-${thatCollectionName}`
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

function mangostana (mongoose) {
    return (self = new Mangostana(mongoose))
}

module.exports = mangostana