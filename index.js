function isInt(n) {
   return typeof n === 'number' && parseFloat(n) == parseInt(n, 10) && !isNaN(n);
} 

function getstrlenght(str){
	var l = 0; 
	var a = str.split(""); 
	for (var i=0;i<a.length;i++) { 
		if (a[i].charCodeAt(0)<299) { 
			l++; 
		} else { 
		//TODO:WTF ? Why it is 3 for Chinese char
			l+=3; 
		} 
	} 
	return l;
}

module.exports = {
	serialize : function(){
		if ( arguments.length != 1 ){
		  throw '.serialize() expects 1 parameter. '+ arguments.length +' given';
		}

		var item = arguments[0];
		var val = null;

		switch ( typeof(item) ) {

		  case 'object' :
			if (item === null) {
			  val = 'N;';
		
			} else if (item.prototype){
			  val = 'o:';
		
			} else {

			  var isArray = (item instanceof Array);
			  var length = 0;
			  var objval = '{';
		  
			  for (var key in item){
				if (item.hasOwnProperty(key)){
				  length++;
				  if (isArray) key = parseInt(key, 10);
				  objval += this.serialize(key);
				  objval += this.serialize(item[key]);  
				}
			  }

			  objval += '}';
			  val = 'a:'+length+':'+objval; 
			}
			break; 
	  
		  case 'string' :
			val = 's:'+ getstrlenght(item)+':"'+item+'";';
			break; 
	  
		  case 'number' :
			if (isInt(item)){
			  //TODO create tests to deal with integer limits on JS and PHP
			  val = 'i:'+item+';';
			} else {
			  val = 'd:'+item+';';
			}
			break; 

		  case 'boolean' :
			val = 'b:'+ ((item) ? 1 : 0) +';';
			break; 

		  case 'undefined' :
			val = 'N;';
			break; 
		}

		return val;
	  },
	deserialize: function(phpstr) {
	  if(!phpstr){
	  	return null;
	  }
	  var idx = 0
		, rstack = []
		, ridx = 0

		, readLength = function () {
			var del = phpstr.indexOf(':', idx)
			  , val = phpstr.substring(idx, del);
			idx = del + 2;
			return parseInt(val);
		  } //end readLength

		, parseAsInt = function () {
			var del = phpstr.indexOf(';', idx)
			  , val = phpstr.substring(idx, del);
			idx = del + 1;
			return parseInt(val);
		  } //end parseAsInt

		, parseAsFloat = function () {
			var del = phpstr.indexOf(';', idx)
			  , val = phpstr.substring(idx, del);
			idx = del + 1;
			return parseFloat(val);
		  } //end parseAsFloat

		, parseAsBoolean = function () {
			var del = phpstr.indexOf(';', idx)
			  , val = phpstr.substring(idx, del);
			idx = del + 1;
			return ("1" === val)? true: false;
		  } //end parseAsBoolean

		, parseAsString = function () {
			var len = readLength()
			  , utfLen = 0
			  , bytes = 0
			  , ch
			  , val;
			while (bytes < len) {
			  ch = phpstr.charCodeAt(idx + utfLen++);
			  if (ch <= 0x007F) {
				bytes++;
			  } else if (ch > 0x07FF) {
				bytes += 3;
			  } else {
				bytes += 2;
			  }
			}
			val = phpstr.substring(idx, idx + utfLen);
			idx += utfLen + 2;
			return val;
		  } //end parseAsString

		, parseAsArray = function () {
			var len = readLength()
			  , resultArray = []
			  , resultHash = {}
			  , keep = resultArray
			  , lref = ridx++
			  , key
			  , val;

			rstack[lref] = keep;
			for (var i = 0; i < len; i++) {
			  key = parseNext();
			  val = parseNext();
			  if (keep === resultArray && parseInt(key) == i) {
				// store in array version
				resultArray.push(val);
			  } else {
				if (keep !== resultHash) {
				  // found first non-sequential numeric key
				  // convert existing data to hash
				  for (var j = 0, alen = resultArray.length; j < alen; j++) {
					resultHash[j] = resultArray[j];
				  }
				  keep = resultHash;
				  rstack[lref] = keep;
				}
				resultHash[key] = val;
			  } //end if
			} //end for

			idx++;
			return keep;
		  } //end parseAsArray

		, parseAsObject = function () {
			var len = readLength()
			  , obj = {}
			  , lref = ridx++
			  , clazzname = phpstr.substring(idx, idx + len)
			  , re_strip = new RegExp("^\u0000(\\*|" + clazzname + ")\u0000")
			  , key
			  , val;

			rstack[lref] = obj;
			idx += len + 2;
			len = readLength();
			for (var i = 0; i < len; i++) {
			  key = parseNext();
			  // private members start with "\u0000CLASSNAME\u0000"
			  // protected members start with "\u0000*\u0000"
			  // we will strip these prefixes
			  key = key.replace(re_strip, '');
			  val = parseNext();
			  obj[key] = val;
			}
			idx++;
			return obj;
		  } //end parseAsObject

		, parseAsRef = function () {
			var ref = parseAsInt();
			// php's ref counter is 1-based; our stack is 0-based.
			return rstack[ref - 1];
		  } //end parseAsRef

		, readType = function () {
			var type = phpstr.charAt(idx);
			idx += 2;
			return type;
		  } //end readType

		, parseNext = function () {
			var type = readType();
			switch (type) {
			  case 'i': return parseAsInt();
			  case 'd': return parseAsFloat();
			  case 'b': return parseAsBoolean();
			  case 's': return parseAsString();
			  case 'a': return parseAsArray();
			  case 'O': return parseAsObject();
			  case 'r': return parseAsRef();
			  case 'R': return parseAsRef();
			  case 'N': return null;
			  default:
				throw {
				  name: "Parse Error",
				  message: "Unknown type'  " + type + "  'at postion " + (idx - 2)
				};
			} //end switch
		}; //end parseNext

		return parseNext();
	} 
};
