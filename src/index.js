// load the things we need
const express = require('express');
const path = require("path");
const app = express();

// setup view engine
app.set('views', path.join(__dirname, './views'))
app.set('view engine', 'ejs');

// setup static files
app.use('/static', express.static(path.join(__dirname, '../public')))

app.get('/', (req, res) => {
  res.render('index', { meta: { title: "The title", description: "Some description", og: { title: "The og title" }}})
})

app.listen(3035);
console.log('3035 is the magic port');