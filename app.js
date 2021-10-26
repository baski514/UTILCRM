const express = require('express')
const mongoose = require('mongoose')
const cors = require("cors");
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express'); 



const dbURL = "mongodb+srv://baski:admin123@cluster0.hlca8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"

const app = express()

const swaggerOptions = {
    swaggerDefinition:{
        info:{
            title:'CRM API',
            version:'1.0.0',
            description:'API INFO',
            servers:["http://localhost:5000"]
        }
    },
    apis:['app.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
console.log(swaggerDocs);
app.use('/api-docs',swaggerUi.serve,swaggerUi.setup(swaggerDocs));



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


/**
 * @swagger
 * /greetme:
 *   get:
 *    description: Get
 *    responses:
 *      '200':
 *        description: Success
 * 
 */
app.get('/greetme',async(req,res,next)=>{
    res.status(200).json({'message':'Own by UtilLabs'})
})


/**
 * @swagger 
 * /object:
 *   post:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            modelName:
 *              type: string
 *              example: account
 *                 
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */
app.post('/object',async(req,res,next)=>{
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
        mongoose.model(req.body.modelName, newObj);
        return res.status(200).json({
            status:true,
            msg:'New Object Created',

            request:{
                type:'POST',
                url: `http://localhost:5000/field/${req.body.modelName}`
            }
            ,
            // request:[
            //     {
            //         type:'GET',
            //         url: `http://localhost:5000/record/${req.body.modelName}`
            //     },
            //     {
            //         type:'POST',
            //         url: `http://localhost:5000/record/${req.body.modelName}`
            //     },
            //     {
            //         type:'PATCH',
            //         url: `http://localhost:5000/record/${req.body.modelName}/{id}`
            //     },
            //     {
            //         type:'DELETE',
            //         url: `http://localhost:5000/record/${req.body.modelName}/{id}`
            //     }
            // ]
        })
    }catch(error){
        console.log(error)
        return res.status(400).json({status:false,msg:error})
    }
})
//

/**
 * @swagger
 * /object:
 *   get:
 *    description: Get all objects
 *    responses:
 *      '200':
 *        description: Success
 * 
 */
app.get('/object',async(req,res,next)=>{
    console.log("ReqBody",req.body);
    const collections = Object.keys(mongoose.connection.collections); 
    return res.status(200).json({status:true,msg:collections})
})

/**
 * @swagger
 * /field/{obj_name}:
 *   get:
 *    desciption: Get fields
 *    parameters:
 *     - in: path
 *       name: obj_name
 *       schema:
 *        type: string
 *       required: true
 *    responses:
 *      '200': 
 *        description: Success
 */
app.get('/field/:obj_name',async (req, res, next) => {
    console.log("ObjectName",req.params.obj_name)
    try {
        var schema = await mongoose.model(req.params.obj_name).schema
        if(schema){
            const fields = Object.values(schema.paths);

            return res.status(200).json({status:true,msg:fields})
        }else{
            return res.status(400).json({status:false,msg:'Error to find your object'})
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({status:false,msg:'Error to find your object'})
    }
})


/**
 * @swagger 
 * /field:
 *   post:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *            fieldName:
 *              type: string
 *              example: email
 *            fieldType:
 *              type: string
 *              example: String
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */
app.post('/field',async(req,res,next)=>{
    console.log("ReqBody",req.body);

    try {
        var schema = await mongoose.model(req.body.obj_name).schema
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

/**
 * @swagger 
 * /record:
 *   post:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *            Name:
 *              type: string
 *              example: Name of Record
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */
app.post('/record',async(req,res,next)=>{
    console.log("ReqBody",req.body);
    if(!req.body){
        return res.status(400).json({status:false,msg:'Body is not expected'})
    }else{
        var schema = await mongoose.model(req.body.obj_name)
        const record = new schema(req.body).save(function (err,res) {
            console.log("RES",res)
            if (err) return res.status(400).json({status:false,msg:'Error to create record'})
            else return res.status(200).json({
                status:true,
                msg:req.body,
                endPoint:[
                    {
                        type:'GET',
                        url: `http://localhost:5000/record/${req.body.obj_name}`
                    }
                ]
            })
          });
    }
})

/**
 * @swagger
 * /record/{obj}:
 *   get:
 *    desciption: Get fields
 *    parameters:
 *     - in: path
 *       name: obj
 *       schema:
 *        type: string
 *       required: true
 *    responses:
 *      '200': 
 *        description: Success
 */
app.get('/record/:obj',async(req,res,next)=>{
    console.log("ReqBody",req.body);
    if(!req.body){
        return res.status(400).json({status:false,msg:'Body is not expected'})
    }else{
        var schema = await mongoose.model(req.params.obj)
        schema.find()
        .exec()
        .then(doc=>{
            if(doc.length>0) return res.status(200).json({status:true, 'msg':doc})
            else return res.status(200).json({status:true, msg: "record not found"})
        })
        .catch(err=>{
            return res.status(404).json({success:false, message:"Something went wrong", msg: err})
        })
    }
})

/**
 * @swagger 
 * /record/{obj}/{id}:
 *   patch:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *        type: string
 *        required: true
 * 
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *            Name:
 *              type: string
 *              example: Name of Record
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */

app.patch('/record/:obj/:id',async(req,res,next)=>{
    console.log("ReqBody",req.body);

    if(!req.body){
        return res.status(400).json({status:false,msg:'Body is not expected'})
    }else{
        var schema = await mongoose.model(req.params.obj)

        let resp = await schema.findOne({'_id':req.params.id});
        if(resp){
            resp = req.body
            schema.findByIdAndUpdate({'_id':req.params.id},resp,null,function(err,docs){
                console.log("Docs ",docs)
                if(err) return res.status(400).json({status:false,'msg':err})
                else return res.status(200).json({status:true,'msg':resp})
            })
        }else{
            return res.status(400).json({status:false,'msg':'Record not found'})
        }
    }
})

/**
 * @swagger 
 * /record/{obj}/{id}:
 *   delete:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *        type: string
 *        required: true
 * 
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */
app.delete('/record/:obj/:id',async(req,res,next)=>{
    console.log("ReqBody",req.body);
    if(!req.body){
        return res.status(400).json({status:false,msg:'Body is not expected'})
    }else{
        var schema = await mongoose.model(req.params.obj)
        let resp = await schema.findOne({'_id':req.params.id});
        if(resp){
            resp = req.body
            schema.findByIdAndRemove({'_id':req.params.id},function(err,docs){
                console.log("Docs ",docs)
                if(err) return res.status(400).json({status:false,'msg':err})
                else return res.status(200).json({status:true,'msg':"Record deleted"})
            })
        }else{
            return res.status(400).json({status:false,'msg':'Record not found'})
        }
    }

})

app.listen(PORT, () => { console.log(`Server running at http://localhost:` + PORT) })
