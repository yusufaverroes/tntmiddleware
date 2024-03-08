import csvManageController from '../controllers/serPrinter/csvManageController.js'

/**
 * @param {e.Application} app
 */
export default function qrCsvRoutes(app) {
    app.route("/v1/qrcsv")
        .post(csvManageController.handleFileUpload)
    app.route("/v1/qrcsv/:filename")
        .get(csvManageController.handleFileUpload)
        .delete(csvManageController.deleteFile)
        app.route("/v1/qrcsv/:filename/doesexist")
        .get(csvManageController.fileExists)
}
