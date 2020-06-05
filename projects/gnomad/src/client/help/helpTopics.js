// eslint-disable-next-line import/no-webpack-loader-syntax,import/no-unresolved,import/extensions
import helpTopics from '@gnomad/help/src/loader!./helpConfig'

export default helpTopics.reduce((acc, topic) => ({ ...acc, [topic.id]: topic }), {})
