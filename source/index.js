/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , path = require('path')
  , serialport = require("serialport");

/**
 * Serial Port Setup.
 */

var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

var portName = '/dev/ttyUSB0'; //This is the standard Raspberry Pi Serial port

var readData = ''; //Array to hold the values read in from the port
const {ModbusMaster, DATA_TYPES} = require('modbus-rtu');

const serialPort = new serialport("/dev/ttyUSB0", {
   baudRate: 57600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});
// var sp = new serialport(portName, {
//   baudRate: 9600,
//   dataBits: 8,
//   parity: 'none',
//   stopBits: 1,
//   flowControl: false
// });

/**
 * Express Setup.
 */

var cors = require('cors');

var app = express();

app.use(cors()); 
var http = require('http').createServer(app);
app.get('/', routes.index)


var io = require('socket.io')(http);
http.listen(3000, () => {
  console.log('listening on *:3000');
});
let axios = require('axios')

/**
 * Actual Server Code

 */
const redis = require("redis");
const redisclient = redis.createClient();

redisclient.on("error", function(error) {
  console.error(error);
});
redisclient.select(1)
  /**
 * Server and socket started, below are all my listeners and emitters
 */

const master = new ModbusMaster(serialPort);
// sp.on('data', function (data) {
//     //format the data buffer as a hex string and calc the crc
//     data.map((result,key) => {
//       redisclient.hset('report_data','port'+key,result)
//     }) 
// })
  
function read() {   

        master.readHoldingRegisters(1, 0, 20).then((data) => {
            // console.log(data)
            let result = [];
            for(let i = 0; i< 10; i++){
              let demo = [Math.abs(data[i*2]),data[i*2+1]]
              let buf = Buffer.allocUnsafe(4);
              buf.writeUInt16BE(demo[0],2);
              buf.writeUInt16BE(demo[1],0);

              result[i] = buf.readFloatBE(0).toFixed(3);
              if(i === 9){
                //console.log(result)
                axios.post('http://data.mtgreentech.vn/api/update-data',{data: result, project_id: 3})
                .then(response => {
                  //console.log(response.data)
                })
              }
            }
            read(); //output will be [10, 100, 110, 50] (numbers just for example)
        }, (err) => {
          console.log(err)
            //or will be rejected with error
            read();
        });
}
read()
setInterval(function(){
  axios.post('http://data.mtgreentech.vn/api/save-data',{project_id: 3})
  .then(response => {
    console.log(response.data)
  })
}, 60000);
setInterval(function(){  

  const ftp = require('./upload');
  const ftpclient = new ftp('113.160.155.126', 21, 'kinhnoi', 'kinhnoiftp@123', false);
  var fs = require('fs')
  let rows ='';
  axios.post('http://data.mtgreentech.vn/api/read-data',{project_id: 3})
    .then(res => {
      let file = res.data;
      let filename = 'BN_KNVN_KHI001_'+file.file;
      file.data.forEach(row => rows += row.split("\\t").join("\t") + '\n');
      //ßconsole.log(rows)
      let month = ("0" + (new Date().getMonth() + 1)).slice(-2);
      var logger = fs.writeFile(filename+'.txt', rows,async (err) => {
        if (err) return console.log(err);
        let pathfile = './'+new Date().getFullYear()+ '/' + month + '/' + ("0" + new Date().getUTCDate()).slice(-2)+'/';
        console.log(pathfile)
        ftpclient.upload(filename+'.txt',pathfile, filename+'.txt', 755);
      });
    })
}, 5*60000);

  const ftp = require('./upload');
  const ftpclient = new ftp('113.160.155.126', 21, 'kinhnoi', 'kinhnoiftp@123', false);
  var fs = require('fs')
  let rows ='';
  axios.post('http://data.mtgreentech.vn/api/read-data',{project_id: 3})
    .then(res => {
      let file = res.data;
      let filename = 'BN_KNVN_KHI001_'+file.file;
      file.data.forEach(row => rows += row.split("\\t").join("\t") + '\n');

      let month = ("0" + (new Date().getMonth() + 1)).slice(-2);
      var logger = fs.writeFile(filename+'.txt', rows,async (err) => {
        if (err) return console.log(err);
        let pathfile = './'+new Date().getFullYear()+ '/' + month+ '/' + ("0" + new Date().getUTCDate()).slice(-2)+'/';
        console.log(pathfile)
        ftpclient.upload(filename+'.txt',pathfile, filename+'.txt', 755);
      });
    })
io.sockets.on('connection', (socket)=>{
  console.log("Socket connected"); 
  socket.on('requestData',() => {
    redisclient.hvals('channels',(err,channels) => {
      io.emit('requestData',channels)
    })
  })
  socket.on('getData',(port) => {
    redisclient.hget('report_data','port'+port,(err,signal) => {
      io.emit('getData'+port,signal)
    })
  })
  socket.on('getSettings',() => {
    redisclient.hvals('channels',(err,channels) => {
      redisclient.hvals('settings',(err,settings) => {
        io.emit('getSettings',channels,settings)
      })
    })
  })
  socket.on('saveSetting',(channels,timeout,baudrate,ftp_time,message_low,message_hight) => {
    redisclient.del('function_channels')
    redisclient.hset('settings','timeout',timeout);
    redisclient.hset('settings','baudrate',baudrate);
    redisclient.hset('settings','ftp_time',ftp_time);
    redisclient.hset('settings','message_low',message_low);
    redisclient.hset('settings','message_hight',message_hight);
    redisclient.del('channels',() => {
      channels.map((channel,key) => {
        redisclient.hset('channels',key,JSON.stringify(channel));
      })
      io.to(socket.id).emit('saveSetting')
    })
  })
  socket.on('saveFunctions',(channels) => {
    redisclient.del('channels',() => {
      channels.map((channel,key) => {
        channel.result = eval(channel.code_function)
        redisclient.hset('channels',key,JSON.stringify(channel));
      })
      io.to(socket.id).emit('saveSetting')
    })
  })
  socket.on('requestFunction',() => {   
    redisclient.hgetall('function_channels',(err, channels) => {
      io.to(socket.id).emit('requestFunction',channels)
    })
  })
});
