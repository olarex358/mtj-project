export const MTJ_TREASURY = { phoneNumber: '08012345678', accountName: 'MTJ Multipurpose Global Services' };
export function buildOPayTransferLink({ amount, note }) {
  return 'https://openapp.opaymobile.com/opayweb/#/transfer?phone=' + MTJ_TREASURY.phoneNumber + '&amount=' + amount + '&note=' + encodeURIComponent(note || 'MTJ Remittance');
}
export function openOPayRemit(amount, reference) {
  window.location.href = 'opay://transfer?phone=' + MTJ_TREASURY.phoneNumber + '&amount=' + amount;
  setTimeout(() => window.open(buildOPayTransferLink({ amount, note: 'Remit ' + reference }), '_blank'), 1500);
}
export function openOPayBusinessDashboard() { window.open('https://business.opayweb.com/transactions', '_blank'); }
export function buildOPayPayoutLink({ phone, amount, name }) {
  return 'https://openapp.opaymobile.com/opayweb/#/transfer?phone=' + phone + '&amount=' + amount + '&name=' + encodeURIComponent(name || '');
}
