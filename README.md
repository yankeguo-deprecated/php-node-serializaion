# PHP Serializer v0.1.0
## IREUL Guo <m@ireul.me>

# Usage

    srlzr=require 'php-srlzr'
    val1=srlzr.serialize {
        name:'name'
        namm:'namm'
    }
    val2=srlzr.deserialize "a:2:i:1:s:1"
