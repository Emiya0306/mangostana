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
        relationName = pluralize.singular(relationName.toLowerCase(), 1)
        this.thatModelName = relationName

        const mappingName = `${relationName}Mapping`
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

class RelationQuery {
    constructor (targetModel, relationship, queryOpts) {
        this.targetModel = targetModel
        this.thisModelName = pluralize.singular(targetModel.collection.name, 1)
        this.thatModelName = pluralize.singular(relationship.toLowerCase(), 1)
        this.relatedCollectionName = pluralize.plural(relationship.toLowerCase(), 4)
        this.query = self._generateQuery(queryOpts, this.thatModelName)

        this.mappingName = this.isModelExisted(this.thatModelName) !== -1 ?
            generateMappingName(this.thisModelName, this.thatModelName) : `${this.thatModelName}Mapping`

        const hasMapping = checkMappingExisted(this.mappingName)
        this.relationMapping = this.isRelationMapping(this.mappingName)

        let mappingSchema = {
            [`${this.thisModelName}Id`]: self.Schema.Types.ObjectId,
            [`${this.thatModelName}Id`]: self.Schema.Types.ObjectId
        }

        if(this.relationMapping) {
            mappingSchema[`${this.thatModelName}Type`] = String
        }

        mappingSchema = new self.Schema(mappingSchema, {collection: this.mappingName})

        this.Mapping = hasMapping ? self.mongoose.models[this.mappingName] : self.mongoose.model(this.mappingName, mappingSchema)
    }

    isRelationMapping (mappingName) {
        return mappingName.indexOf('Mapping') !== -1
    }

    with () {

    }

    isModelExisted (modelName) {
        return Object.keys(self.mongoose.models).indexOf(modelName)
    }

    generateAggregate () {
        return this.Mapping.findOne({[`${this.thisModelName}Id`]: this.targetModel._id})
            .then((mapping) => {
                const collectionName = this.relationMapping ?
                    pluralize.plural(mapping[`${this.thatModelName}Type`], 4) : this.relatedCollectionName

                return this.Mapping.aggregate(
                    // get the all the linked model mappings
                    {$match: {[`${this.thisModelName}Id`]: this.targetModel._id}},
                    // lookup the documents from linked collection
                    {$lookup: {from: collectionName, localField: `${this.thatModelName}Id`, foreignField: '_id', as: this.thatModelName}},
                    // resolve the lookup array of thatModel
                    {$unwind: `$${this.thatModelName}`},
                    // add additional query of customer
                    {$match: this.query},
                    // group the documents together
                    {$group: {_id: `$${this.thisModelName}Id`, [this.thatModelName]: {$addToSet: `$${this.thatModelName}`}}}
                    )
                    // group has 100 MB of RAM, allowDiskUse can write data to temporary files
                    .allowDiskUse(true)
                    .then((result) => {
                        if (result.length !== 0) {
                            return result[0][this.thatModelName]
                        } else {
                            return []
                        }
                    })
            })
    }

    then (resolve, reject) {
        return this.generateAggregate().then(resolve, reject)
    }

    catch (reject) {
        return this.generateAggregate().then(null, reject)
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
        return new RelationQuery(this, modelName, queryOpts)
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
        if (modelName.toLowerCase() === mappingName.toLowerCase()) {
            hasMapping = true
        }
    })

    return hasMapping
}

function mangostana (mongoose) {
    return (self = new Mangostana(mongoose))
}

module.exports = mangostana