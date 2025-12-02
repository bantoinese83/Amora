/**
 * Shared Types
 * Types used by both client and server
 */
export var ConnectionStatus;
(function (ConnectionStatus) {
  ConnectionStatus['DISCONNECTED'] = 'disconnected';
  ConnectionStatus['CONNECTING'] = 'connecting';
  ConnectionStatus['CONNECTED'] = 'connected';
  ConnectionStatus['ERROR'] = 'error';
})(ConnectionStatus || (ConnectionStatus = {}));
//# sourceMappingURL=index.js.map
