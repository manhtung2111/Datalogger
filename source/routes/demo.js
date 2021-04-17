var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

// open connection to a serial port
client.connectRTUBuffered("/dev/serial0", { baudRate: 9600 }, read);

function write() {
    client.setID(1);
    // write the values 0, 0xffff to registers starting at address 5
    // on device number 1.
    client.writeRegisters(16, [0 , 0xffff])
        .then(read);
}

function read() {
    // read the 2 registers starting at address 5
    // on device number 1.
    client.readHoldingRegisters(16, 1, (err,data) => {
	console.log(data.data)
	})
}
setInterval(read,1000)