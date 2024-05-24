import printProcessController from '../controllers/serPrinter/printProcessController.js'

/**
 * @param {e.Application} app
 */
export default function printRoutes(app) {
    app.route("/v1/printer/start")
        .post(printProcessController.startPrinting)
    app.route("/v1/printer/stop")
        .post(printProcessController.stopPrinting)


}
