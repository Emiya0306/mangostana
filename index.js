const pluralize = require('pluralize')

var self

class MappingQuery {
    constructor (thisModel, thatModel, action) {
        this.action = action
        this.thisModel = thisModel
        this.thatModel = thatModel

        this.thisModelName = pluralize.singular(thisModel.collection.name, 1)
        this.thatModelName = pluralize.singular(thatModel.collection.name, 1)

        this.thatModelName = this.thisModelName == this.thatModelName ? `${this.thatModelName}Duplicate` : this.thatModelName
    }

    as (relationName, bothRelation) {
        const thatModelName = this.thatModelName.replace('Duplicate', '')
        this.thatModelName = relationName

        const mappingName = `${pluralize.singular(relationName.toLowerCase(), 1)}Mapping`
        const Mapping = this.generateMappingModel(mappingName, true)

        const relations = []

        relations.push(new Mapping({
            [`${this.thisModelName}Id`]: this.thisModel._id,
            [`${this.thatModelName}Id`]: this.thatModel._id,
            [`${this.thatModelName}Type`]: thatModelName
        }))

        if(bothRelation) {
            relations.push(new Mapping({
                [`${this.thisModelName}Id`]: this.thatModel._id,
                [`${this.thatModelName}Id`]: this.thisModel._id,
                [`${this.thatModelName}Type`]: thatModelName
            }))
        }

        return Promise.all(
            relations.map(relation => relation.save())
        )
    }

    then (resolve, reject) {
        return this.generatePromise().then(resolve, reject)
    }

    catch (reject) {
        return this.generatePromise().then(null, reject)
    }

    generatePromise () {
        let action

        const mappingName = generateMappingName(this.thisModelName, this.thatModelName)
        const Mapping = this.generateMappingModel(mappingName)

        switch (this.action) {
            case 'link':
                action = new Mapping({
                    [`${this.thisModelName}Id`]: this.thisModel._id,
                    [`${this.thatModelName}Id`]: this.thatModel._id
                }).save()
                break

            case 'unlink':
                action = Mapping.findOneAndRemove({
                    [`${this.thisModelName}Id`]: this.thisModel._id,
                    [`${this.thatModelName}Id`]: this.thatModel._id
                })
                break

            default:
                throw new Error('Unsupport action type on MappingQuery')
                break
        }
        return action
    }

    generateMappingModel (mappingName, hasType) {
        const hasMapping = checkMappingExisted(mappingName)

        if (hasMapping) {
            return self.mongoose.models[mappingName]
        } else {
            const schema = {
                [`${this.thisModelName}Id`]: self.Schema.Types.ObjectId,
                [`${this.thatModelName}Id`]: self.Schema.Types.ObjectId
            }

            if(hasType) {
                schema[`${this.thatModelName}Type`] = String
            }

            const mappingSchema = new self.Schema(schema, {collection: mappingName})

            return self.mongoose.model(mappingName, mappingSchema)
        }
    }
}

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
        return new MappingQuery(this, that, 'link')
    }

    unlink (that) {
        return new MappingQuery(this, that, 'unlink')
    }

    getRelation (modelName, queryOpts) {
        const thisModelName = pluralize.singular(this.collection.name, 1)
        const thatModelName = pluralize.singular(modelName.toLowerCase(), 1)
        const relatedCollectionName = pluralize.plural(modelName.toLowerCase(), 4)
        const query = self._generateQuery(queryOpts, thatModelName)

        const mappingName = generateMappingName(thisModelName, thatModelName)

        const hasMapping = checkMappingExisted(mappingName)

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

function generateMappingName (thisCollectionName, thatCollectionName) {
    return thisCollectionName.toLowerCase() > thatCollectionName.toLowerCase() ?
        `${thatCollectionName}-${thisCollectionName}` :
        `${thisCollectionName}-${thatCollectionName}`
}

function checkMappingExisted (mappingName) {
    let hasMapping = false

    const modelsName = Object.keys(self.models)

    modelsName.forEach((modelName) => {
        if (modelName.toLowerCase() === mappingName) {
            hasMapping = true
        }
    })
    return hasMapping
}

function mangostana (mongoose) {
    return (self = new Mangostana(mongoose))
}

module.exports = mangostana