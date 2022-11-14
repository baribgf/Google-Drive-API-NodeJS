// A simple tool to manage google drive with NodeJS

const fs = require('fs');
const { authenticate } = require('@google-cloud/local-auth');
const { google, drive_v2 } = require('googleapis');
const stream = require('stream');
const path = require('path');

class GoogleDriveService {
    tokenPath = null
    credentialsPath = null
    constructor(tokenPath, credentialsPath) {
        this.tokenPath = tokenPath
        this.credentialsPath = credentialsPath
    }

    async authorize() {
        let auth = null
        try {
            auth = google.auth.fromJSON(JSON.parse(await fs.readFileSync(this.tokenPath)));
            return auth
        } catch {
            if (this.credentialsPath == null) {
                return console.log("Credentials path is required cause tokenpath is not found!")
            }
            auth = await authenticate({
                scopes: ["https://www.googleapis.com/auth/drive"],
                keyfilePath: this.credentialsPath
            })
            const payload = JSON.stringify({
                type: 'authorized_user',
                client_id: auth._clientId,
                client_secret: auth._clientSecret,
                refresh_token: auth.credentials.refresh_token,
            });
            await fs.writeFileSync(this.tokenPath, payload);
            return auth
        }
    }

    async readFile(fileId, callback = null, responseType) {
        const auth = await this.authorize()
        if (auth == null) return null;

        const drive = google.drive({ version: 'v3', auth: auth });

        try {
            const file = await drive.files.get(
                {
                    fileId: fileId,
                    alt: "media",
                    fields: "modifiedTime"
                },
                { responseType: responseType }
            )

            if (callback) callback(file.data);

            return file.data;
        } catch (err) { throw err }
    }

    async uploadFile(filePath, parents) {
        const auth = await this.authorize()
        if (auth == null) return null;

        const drive = google.drive({ version: 'v3', auth: auth });

        try {
            let mimeType = "text/plain"
            let filePathSplit = filePath.split(".")
            switch (filePathSplit[filePathSplit.length - 1]) {
                case "jpg":
                    mimeType = "image/gif"
                    break;
                case "png":
                    mimeType = "image/gif"
                    break;
                case "html":
                    mimeType = "text/html"
                    break;
            }

            const file = await drive.files.create({
                resource: {
                    name: path.basename(filePath),
                    parents: [parents]
                },
                media: {
                    mimeType: mimeType,
                    body: fs.createReadStream(filePath),
                },
                fields: 'id',
            });

            return file.data.id;
        } catch (err) {
            throw err
        }
    }
    async listFiles(folderId, callback = null) {
        const auth = await this.authorize()
        if (auth == null) return null;

        const drive = google.drive({ version: 'v3', auth: auth });

        try {
            const list = await drive.files.list({
                fields: "nextPageToken, files(id, name)",
                q: `'${folderId}' in parents`
            })

            callback(list.data.files)

            return list.data.files

        } catch (error) {
            throw error
        }
    }

    async createFolder(folderName, parents) {
        const auth = await this.authorize()
        if (auth == null) return null;

        const drive = google.drive({ version: 'v3', auth: auth });

        try {
            const folder = await drive.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parents]
                },
                fields: 'id'
            })

            return folder.data.id;

        } catch (error) {
            throw error
        }
    }
}

module.exports = { GoogleDriveService }
