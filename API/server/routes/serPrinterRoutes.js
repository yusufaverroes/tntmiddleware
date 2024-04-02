import printProcessController from '../controllers/serPrinter/printProcessController.js'

/**
 * @param {e.Application} app
 */
export default function printRoute(app) {
    app.route("/v1/printer/:workstationId/start")
        .post(printProcessController.startPrinting)
    app.route('/v1/printer/:workstationId')
        .get(printProcessController.printerDetails)

}
