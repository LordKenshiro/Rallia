/**
 * Z-Index Tokens
 *
 * Layering system for stacking contexts.
 * Organized by component type for predictable layering.
 */

/**
 * Z-index scale
 * Organized in groups of 10 for flexibility
 */
export const zIndex = {
  // Hidden (below everything)
  hide: -1,

  // Base layer (default)
  base: 0,
  auto: 'auto',

  // Raised elements (cards with shadows, etc.)
  raised: 10,

  // Dropdowns and menus
  dropdown: 20,

  // Sticky elements (headers, tabs)
  sticky: 30,

  // Fixed elements (floating buttons, sidebars)
  fixed: 40,

  // Overlays (backdrops, scrims)
  overlay: 50,

  // Modals and dialogs
  modal: 60,

  // Popovers and tooltips
  popover: 70,

  // Toasts and notifications
  toast: 80,

  // Maximum priority (loading screens, critical alerts)
  max: 100,
} as const;

/**
 * Semantic z-index tokens for common components
 */
export const zIndexSemantic = {
  // Navigation
  navBar: zIndex.sticky,
  sideBar: zIndex.fixed,
  bottomNav: zIndex.sticky,

  // Floating elements
  floatingButton: zIndex.fixed,
  speedDial: zIndex.fixed,

  // Overlays
  backdrop: zIndex.overlay,
  drawer: zIndex.overlay,
  sheet: zIndex.overlay,

  // Dialogs
  dialog: zIndex.modal,
  alertDialog: zIndex.modal,
  confirmDialog: zIndex.modal,

  // Tooltips and popovers
  tooltip: zIndex.popover,
  popoverContent: zIndex.popover,
  dropdownMenu: zIndex.dropdown,
  contextMenu: zIndex.dropdown,
  selectOptions: zIndex.dropdown,

  // Feedback
  snackbar: zIndex.toast,
  notification: zIndex.toast,
  toastMessage: zIndex.toast,

  // Special
  loading: zIndex.max,
  splash: zIndex.max,
} as const;

export type ZIndexKey = keyof typeof zIndex;
export type ZIndexValue = (typeof zIndex)[ZIndexKey];
export type ZIndexSemanticKey = keyof typeof zIndexSemantic;


