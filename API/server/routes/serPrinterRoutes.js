import printProcessController from '../controllers/serPrinter/printProcessController.js'

/**
 * @param {e.Application} app
 */
export default function configureAccountInfoRoutes(app) {
    app.route("/v1/printer/start")
        .post(printProcessController.startPrinting)
    app.route("/v1/printer/stop")
        .post(printProcessController.stopPrinting)   
    app.route("/v1/printer/format")
        .post(printProcessController.setPrinterFormat)
    app.route("/v1/printer/inkStatus")
        .post(printProcessController.getInkStattus)
    //TODO:
    //current print infos/order status

}
