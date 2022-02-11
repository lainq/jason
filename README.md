<div align="center">
<img src="https://user-images.githubusercontent.com/70764593/152684010-fbcde63b-a032-4a82-a6ad-0439f6387b5f.png" />

A simple inefficient and buggy JSON parser written in JavaScript
</div>


> The project is archived 


> This JSON parser isn't guaranteed to work properly. Its recommended to use builtin `JSON.parse` instead of this

### What is Jason

Jason is a simple inefficient and buggy JSON parser

#### Installation
```
npm i jason-parser
```

#### How to use it
```js
import { parse } from 'jason-parser'
// or
const { parse } = require('jason-parser')

const jsonString = '{"key":{"another-key":3}}'
const object = parse(jsonString)
```



### Why would someone use 
![pepeshrug](https://cdn.discordapp.com/emojis/771091931559886869.webp?size=96&quality=lossless)

Don't
