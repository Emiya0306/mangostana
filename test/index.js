const mongoose = require('mongoose')
const mangostana = require('../')

mongoose.connect('mongodb://localhost/test')

mangostana(mongoose)

const Cat = mongoose.model('Cat', { name: String })
const Dog = mongoose.model('Dog', { name: String })

const kitty = new Cat({ name: 'kitty' })
const snoopy = new Dog({ name: 'snoopy' })

const aa = new Cat({ name: 'aa' })
const bb = new Dog({ name: 'bb' })

let catResult1, dogResult1, catResult2, dogResult2

kitty.save()
    .then((result) => {
        catResult1 = result

        return snoopy.save()
    })
    .then((result) => {
        dogResult1 = result

        return aa.save()
    })
    .then((result) => {
        catResult2 = result

        return bb.save()
    })
    .then((result) => {
        dogResult2 = result
    })
    .then(() => {
        return catResult1.link(dogResult1)
    })
    .then((relation) => {
        console.log(relation)
    })
    .then(() => {
        return catResult2.link(dogResult2)
    })
    .then((relation) => {
        console.log(relation)
    })
    .then(() => {
        return catResult1.getRelation('Dog', {name: 'snoopy'})
    })
    .then((result) => {
        console.log('result', result)
    })
    .then(() => {
        return catResult1.unlink(dogResult1)
    })
    .then(() => {
        return catResult2.unlink(dogResult2)
    })
    .catch((err) => {
        console.log('err', err)
    })
