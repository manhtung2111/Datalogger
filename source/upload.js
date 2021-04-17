const ftp = require('basic-ftp');
const fs = require('fs');

class FTPClient {
    constructor(
      host = '113.160.155.126', 
      port = 21, 
      username = 'kinhnoi',
      password = 'kinhnoiftp@123',
      secure = false
      ) {
        this.client = new ftp.Client();
        this.settings = {
            host: host,
            port: port,
            user: username,
            password: password,
            secure: secure
        };
    }

    upload(sourcePath, remotePath,filename, permissions) {
        let self = this;
        (async () => {
            try {
                let access = await self.client.access(self.settings);
                await self.client.ensureDir(remotePath)
                let upload = await self.client.upload(fs.createReadStream(sourcePath), filename);
                // let permissios = await self.changePermissions(permissions.toString(), remotePath+filename);
                fs.unlinkSync(sourcePath);
            } catch(err) {
                console.log(err);
            }
            self.client.close();
        })();
    }

    close() {
        this.client.close();
    }

    changePermissions(perms, filepath) {
        let cmd = 'SITE CHMOD ' + perms + ' ' + filepath;
        return this.client.send(cmd, false);
    }
}

module.exports = FTPClient;