require('dotenv').config();
module.exports=require('mysql2/promise').createPool({host:process.env.DB_HOST||'localhost',user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'bizlens',dateStrings:true,decimalNumbers:true,connectionLimit:10});
