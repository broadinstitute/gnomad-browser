import { ReactNode } from 'react'

type PropsWithSize<P> = {
  size: {
    width: number | null
    height: number | null
  }
  props: P[]
}

type FnWithSize<P> = (...propsWithSize: PropsWithSize<P>[]) => ReactNode

export const withSize =
  <P>(_options: any) =>
  (fn: FnWithSize<P>) =>
  ({ ...props }: { props: P[] }) =>
    fn({ ...props, size: { width: null, height: null } })
