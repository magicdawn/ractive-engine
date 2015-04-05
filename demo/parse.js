var Ractive = require('../ractive/ractive');
var inspect = require('util').inspect;

var tmpl = `
{{#extend abc}}
{{/extend}}

{{#extend './abc'}}
{{/extend}}

{{>somePartial}}

{{#block header}}
  hello
  {{>partial2}}
  {{#if true}}
    {{>partial3}}
  {{/if}}
{{/block}}
`;

tmpl = `
{{#extend basic}}
{{/extend}}

<div class="content-left">
  content-left
</div>

<div class="content-right">
  {{#block body}}
  {{/block}}
</div>
`;

var result = Ractive.parse(tmpl);
console.log(inspect(result, {
  depth: null
}));

var result = {
  v: 1,
  t: [{
      t: 4,
      n: 55,
      r: 'abc',
      f: []
    },
    ' ', {
      t: 8,
      r: 'somePartial'
    },
    ' ', {
      t: 4,
      n: 56,
      r: 'header',
      f: ['hello ', {
          t: 8,
          r: 'partial2'
        },
        ' ', {
          t: 4,
          n: 50,
          x: {
            r: [],
            s: 'true'
          },
          f: [{
            t: 8,
            r: 'partial3'
          }]
        }
      ]
    }
  ]
}