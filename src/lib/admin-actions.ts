// Point d'entrée des actions d'administration, regroupées par domaine
// (voir src/lib/actions/). Conserve les imports existants inchangés.

export {
  loginAction,
  logoutAction,
  changePasswordAction,
} from "./actions/session";

export {
  createPageAction,
  updatePageAction,
  convertPageToBuilderAction,
  convertPageToHtmlAction,
  togglePagePublishedAction,
  deletePageAction,
} from "./actions/pages";

export {
  addMenuItemAction,
  updateMenuItemAction,
  moveMenuItemAction,
  deleteMenuItemAction,
} from "./actions/menu";

export {
  toggleMessageReadAction,
  deleteMessageAction,
} from "./actions/messages";

export {
  saveProductAction,
  deleteProductAction,
} from "./actions/products";

export { updateOrderStatusAction, checkOrderPaymentAction } from "./actions/orders";

export {
  saveSettingsAction,
  saveHeroAction,
  saveWidgetsAction,
  saveStripeSettingsAction,
  saveRecaptchaSettingsAction,
} from "./actions/settings";
