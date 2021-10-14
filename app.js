const express = require('express')
const mongoose = require('mongoose')
const cors = require("cors");



const dbURL = "mongodb+srv://baski:admin123@cluster0.hlca8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"

const app = express()
app.use(express.json())
app.use(cors());
app.use(express.urlencoded({ extended: false }))

const PORT = process.env.PORT||5000

mongoose.connect(dbURL,{useNewUrlParser:true,useUnifiedTopology:true})
    .then(() => {
        console.log('db Connected')
    })
    .catch((err) => {
        console.log('Failed to connect db' +err)
})

app.get('/',async(req,res,next)=>{
    res.status(200).json({'message':'Own by UtilLabs'})
})



app.post('/createObject',async(req,res,next)=>{
    console.log("ReqBody",req.body);
    
    let fields = {}
    if(req.body.fields){
        fields = req.body.fields
    }else{
        fields.Id = {type:String}
        fields.Name = {type:String}
    }
    
    try{
        var newObj = new mongoose.Schema(fields);
        // module.exports = mongoose.model(req.body.modelName, newObj);
        mongoose.model(req.body.modelName, newObj);
        return res.status(200).json({status:true,msg:'New Object Created'})
    }catch(error){
        console.log(error)
        return res.status(400).json({status:false,msg:error})
    }
})

app.get('/getObjects',async(req,res,next)=>{
    console.log("ReqBody",req.body);
    const collections = Object.keys(mongoose.connection.collections); 
    return res.status(200).json({status:true,msg:collections})
})


app.get('/getFieldsOfObject/:obj_name',async (req, res, next) => {
    console.log("ObjectName",req.params.obj_name)
    try {
        var schema = await mongoose.model(req.params.obj_name).schema
        if(schema){
            return res.status(200).json({status:true,msg:schema.paths})
        }else{
            return res.status(400).json({status:false,msg:'Error to find your object'})
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({status:false,msg:'Error to find your object'})
    }
})

app.post('/addField/:obj_name',async(req,res,next)=>{
    console.log("ReqBody",req.body);

    try {
        var schema = await mongoose.model(req.params.obj_name).schema
        let fields;

        if(req.body.fieldType){
            switch(req.body.fieldType){
                case "String":
                    fields = {[req.body.fieldName]:{type:String}}
                    break;
                case "Number":
                    fields = {[req.body.fieldName]:{type:Number}}
                    break;    
            }
        }
        schema.add(fields)
        res.status(200).json({
            status:true,
            msg:'New Field created'
        })
    } catch (error) {
        console.log(error)
        return res.status(400).json({status:false,msg:error})
    }
})

app.listen(PORT, () => { console.log(`Server running at http://localhost:` + PORT) })
