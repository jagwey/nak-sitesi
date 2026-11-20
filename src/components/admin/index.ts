/**
 * Admin UI kit (shared by all admin pages; D1 + D2).
 *
 * Server-safe (no hooks, usable in server components):
 *   PageHeader({title, description?, actions?})
 *   Panel({title?, description?, children, className?})           white bordered section
 *   FormField({label, htmlFor?, hint?, error?, required?, children})
 *   EmptyState({title, description?, action?})
 *   StatusBadge({tone: neutral|success|warn|danger, children}), ProductStatusBadge({status}), PRODUCT_TYPE_LABEL
 *   Notice({tone?, title?, children})                              inline message (danger => role=alert)
 *   LinkButton({href, variant?, children})
 *   DataTable<T>({columns: Column<T>[], rows, rowKey, empty?})     table md+, stacked cards on mobile
 *       Column = {key, header, cell(row), className?, hideOnMobile?, primary?}
 *   Pagination({basePath, page, pageSize, total, params?})         link-based, keeps `params`
 *
 * Client components ("use client"):
 *   AdminShell({permissions: string[], userLabel, children})       nav filtered by permission, mobile drawer
 *   Uploader({url, fieldName?, accept?, multiple?, fields?, label?, hint?, validate?, onUploaded?, onBatchDone?})
 *       XHR upload with per-file progress bars.
 *   ConfirmDialog({open, title, message?, confirmLabel?, danger?, busy?, onConfirm, onCancel, children?})
 *
 * Helpers:
 *   adminFetch(path, {method?, body?}) -> JSON or throws ApiError (Turkish message)
 *   errMsg(e) -> string ; fieldErrors(e) -> {path: message} ; uploadForm(url, FormData, onProgress?)
 *   Style strings: inputCls, textareaCls, selectCls, btnCls(variant, extra?), cardCls
 *
 * Server guard (src/server/modules/admin-catalog/guard.ts): every admin page must call
 *   `const user = await requireAdminPage("<permission>")` itself (layouts do not re-run on client navigation).
 */
export { PageHeader, Panel, FormField, EmptyState, StatusBadge, ProductStatusBadge, PRODUCT_TYPE_LABEL, Notice, LinkButton, DataTable, Pagination } from "./primitives";
export type { Column, Tone } from "./primitives";
export { AdminShell } from "./AdminShell";
export { Uploader } from "./Uploader";
export type { UploaderProps } from "./Uploader";
export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";
export { adminFetch, errMsg, fieldErrors, uploadForm } from "./adminFetch";
export { inputCls, textareaCls, selectCls, btnCls, cardCls } from "./styles";
export type { ButtonVariant } from "./styles";
