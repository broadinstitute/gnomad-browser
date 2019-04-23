import styled from 'styled-components'

export const BaseTable = styled.table`
  border-collapse: collapse;
  border-spacing: 0;

  td,
  th {
    padding: 0.5em 10px 0.5em 0;
    text-align: left;
  }

  thead {
    th {
      border-bottom: 1px solid #000;
      background-position: center right;
      background-repeat: no-repeat;

      &[aria-sort='ascending'] {
        background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjI8Bya2wnINUMopZAQA7');
      }

      &[aria-sort='descending'] {
        background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7');
      }

      button {
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        cursor: pointer;
        font: inherit;
        outline: none;
        user-select: none;
      }
    }
  }

  tbody {
    td,
    th {
      border-bottom: 1px solid #ccc;
      font-weight: normal;
    }
  }

  tfoot {
    td,
    th {
      border-top: 1px solid #ccc;
      font-weight: bold;
    }
  }
`
