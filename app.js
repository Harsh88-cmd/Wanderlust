if(process.env.NODE_ENV != "production"){
    require("dotenv").config()
}


const express = require("express")
const app= express()
const mongoose= require("mongoose")
const path= require("path")
const methodOverride =require("method-override")
const ejsMate = require("ejs-mate")
const ExpressError = require("./utils/ExpressError.js")
const session = require("express-session")
const MongoStore = require('connect-mongo') 
const flash = require("connect-flash")
const passport= require("passport")
const LocalStrategy = require("passport-local")
const User = require("./models/user.js")



const listingRouter = require("./routes/listing.js")
const reviewRouter = require("./routes/review.js")
const userRouter = require("./routes/user.js")
const { required } = require("joi")

// const MONGO_URL = 'mongodb://127.0.0.1:27017/wanderlust'
const dbUrl =process.env.ATLASDB_URL

main().then(()=>{
    console.log("connected to DB")
})
.catch((err)=>{
    console.log(err)
})

async function main(){
    await mongoose.connect(dbUrl)
}

app.set("view engine", "ejs")
app.set("views", path.join(__dirname , "views"))
app.use(express.urlencoded({extended:true}))
app.use(methodOverride ("_method"))
app.engine("ejs", ejsMate)
app.use(express.static(path.join(__dirname,"/public")))


const store = MongoStore.create({
  mongoUrl: dbUrl,
  ttl: 24 * 60 * 60,
  autoRemove: "native",
});

store.on("error", (err) =>{
    console.log("Error in MONGO SESSION STORE", err)
})

const sessionOptions ={
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:{
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
}
 


app.use(session(sessionOptions))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next)=>{
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    res.locals.currUser = req.user || null
    next()
})


app.get('/favicon.ico', (req, res) => res.status(204));

app.use("/listings", listingRouter)
app.use("/listings/:id/reviews", reviewRouter)
app.use("/", userRouter)


app.get(/(.*)/, (req, res, next) => {
    console.log(req.path, req.params); // req.params will be { '0': '/the/path' 
    next(new ExpressError(400,"Page Not Found!"));
});
 
    app.use((err, req,res,next)=>{
        let {statusCode=500, message="something went wrong"} = err
       res.status(statusCode).render("error.ejs",{message})
        //res.status(statusCode).send(message)
    })

app.listen(8080, ()=>{
    console.log("server is listening to port 8080")
})
