
//TODO update the masterRoute (Done)


import printRoutes from "./routes/serPrinterRoutes.js"
import masterConfigRoutes from "./routes/masterConfigRoutes.js";

export default function initializeRoutes(app) {

    masterConfigRoutes(app);
    printRoutes(app);

}
