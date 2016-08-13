const mangostana = require('../')
const test = require('./test')

mangostana.connect('mongodb://localhost/test')

mangostana.createModel('user', { name:  String }, { timestamps: true })
mangostana.createModel('article', { title:  String, content: String }, { timestamps: true })

const user = new mangostana.models.user({ name: 'Zildjian' })
const article = new mangostana.models.article({ title: 'article', content: 'content' })

var userResult, articleResult

user.save()
    .then((result) => {
        userResult = result
        console.log('userResult', userResult)
        return article.save()
    })
    .then((result) => {
        articleResult = result
        console.log('articleResult', articleResult)
        return userResult.link(articleResult)
    })
    .then((result) => {
        console.log('link', result)

        return userResult.unlink(articleResult)
    })
    .then((result) => {
        console.log('unlink', result)
    })
    .catch((err) => console.log(err))