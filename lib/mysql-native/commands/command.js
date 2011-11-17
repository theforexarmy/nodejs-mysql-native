var util = require('util');
var EventEmitter = require('events').EventEmitter;
  
//
// base for all commands
// initialises EventEmitter and implemets state mashine
//
function cmd(handlers)
{
  //this.fieldindex = 0;
  this.state = 'start';
  //this.stmt = ''
  this.params = []
  
  // mixin all handlers  
  for (h in handlers)
      this[h] = handlers[h];
  // save command name to display in debug output
  this.command_name = cmd.caller.command_name;

  // TODO: measure performance or/and remove arguments
  this.args = Array.prototype.slice.call(cmd.caller.arguments);
}
util.inherits(cmd, EventEmitter)

cmd.prototype.process = function(r) 
{

  //console.error([new Error().trace, r]);
  //if (this.client.verbose)
  //    console.log([this.command_name, this.state, this.args]);
  if (r && r.isErrorPacket())
  {
      var reserror = r.readOKpacket();
      // build a standard error object
      var e = new Error();
      e.num = reserror.errno;
      e.message = reserror.message;
      e.command = this.command_name;
      if (this.params) 
          e.params = this.params
      this.emit('error', e);
      return true;
  }

  //var next_state = (this[this.state]) ? this[this.state].apply(this, arguments) : 'done'
  var next_state = (this[this.state]) ? this[this.state](r) : 'done'
  if (next_state) 
     this.state = next_state;
  //console.log(['--->', this.command_name, this.state, this.args]);  

  if (this.state == 'done')
  {
     this.emit('end', this);
     return true;
  } 
  if (this.state == 'error') 
  {
      console.log('error state!!!');
      return true;
  }

  return false;
}

cmd.prototype.write = function(packet, pnum) {
  packet.addHeader(pnum);
  this.connection.socket.write(packet.data, 'binary');  
}

cmd.prototype.store_column = function(r,f,v, row_as_hash) {
  if (this.client.get('row_as_hash') || row_as_hash)
    (f.name == '?') ? r[this.fieldindex] = v : r[f.name] = v;
  else
    r.push(v);

  // keep track of the field count. used primarily for prepared statements
  this.fieldindex++
}

module.exports = cmd