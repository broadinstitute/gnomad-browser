// Order properties based on idiomatic CSS
// https://github.com/necolas/idiomatic-css#declaration-order

const priority = ['content'];

const positioning = ['position', 'z-index', 'top', 'right', 'bottom', 'left'];

// https://www.w3.org/TR/css-flexbox-1/
const FlexibleBoxLayoutModule = [
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'flex-flow',
  'flex-wrap',
  'flex-direction',
  'order',
];

const gridParentRules = [
  'grid-template',
  'grid-template-columns',
  'grid-template-rows',
  'grid-template-areas',
  'grid-gap',
  'grid-column-gap',
  'grid-row-gap',
  'grid',
  'grid-auto-columns',
  'grid-auto-rows',
  'grid-auto-flow',
];

const gridChildrenRules = [
  'grid-area',
  'grid-column',
  'grid-row',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
];

// https://www.w3.org/TR/css-grid-1/
const CSSGridLayoutModule = [...gridParentRules, ...gridChildrenRules];

// https://www.w3.org/TR/css-align-3/
const CSSBoxAlignmentModule = [
  'justify-items',
  'justify-content',
  'justify-self',
  'align-items',
  'align-content',
  'align-self',
];

const boxModel = [
  'display',
  ...CSSGridLayoutModule,
  ...FlexibleBoxLayoutModule,
  ...CSSBoxAlignmentModule,
  'overflow',
  'overflow-x',
  'overflow-y',
  'box-sizing',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
];

const backgrounds = [
  'background',
  'background-color',
  'background-image',
  'background-position',
  'background-size',
  'background-repeat',
  'background-origin',
  'background-clip',
  'background-attachment',
];

const typography = [
  'color',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-indent',
  'text-overflow',
  'text-shadow',
  'text-transform',
  'white-space',
  'word-break',
  'word-spacing',
];

const propertiesOrder = [...priority, ...positioning, ...boxModel, ...backgrounds, ...typography];

module.exports = {
  processors: ['stylelint-processor-styled-components'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-styled-components',
  ],
  plugins: 'stylelint-order',
  syntax: 'scss',
  rules: {
    // This rule sometimes conflicts with ESLint and Prettier in styled components
    // that contain multi-line functions
    'declaration-colon-newline-after': null,
    'unit-whitelist': ['%', 'deg', 'em', 'rem', 's', 'px', 'vw', 'vh'],
    'order/properties-order': [propertiesOrder],
  },
  ignoreFiles: './**/node_modules/**/*',
}
