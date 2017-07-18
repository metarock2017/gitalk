import {
  axiosGithub
} from '../util'

const getQL = (vars, pagerDirection) => {
  const cursorDirection = pagerDirection === 'last' ? 'before' : 'after'
  const ql = `
  query getIssueAndComments(
    $owner: String!,
    $repo: String!,
    $id: Int!,
    $cursor: String,
    $pageSize: Int!
  ) {
    repository(owner: $owner, name: $repo) {
      issue(number: $id) {
        title
        url
        bodyHTML
        createdAt
        comments(${pagerDirection}: $pageSize, ${cursorDirection}: $cursor) {
          totalCount
          pageInfo {
            ${pagerDirection === 'last' ? 'hasPreviousPage' : 'hasNextPage'}
            ${cursorDirection === 'before' ? 'startCursor' : 'endCursor'}
          }
          nodes {
            databaseId
            author {
              avatarUrl
              login
              url
            }
            bodyHTML
            createdAt
          }
        }
      }
    }
  }
  `

  if (vars.cursor === null) delete vars.cursor

  return {
    operationName: 'getIssueAndComments',
    query: ql,
    variables: vars
  }
}

function getComments () {
  const { owner, repo, perPage, pagerDirection } = this.options
  const { cursor, comments, issue } = this.state
  return axiosGithub.post(
    '/graphql',
    getQL(
      {
        owner,
        repo,
        id: issue.number,
        pageSize: perPage,
        cursor
      },
      pagerDirection
    ), {
      headers: {
        Authorization: `bearer ${this.accessToken}`
      }
    }
  ).then(res => {
    const data = res.data.data.repository.issue.comments
    const items = data.nodes.map(node => ({
      id: node.databaseId,
      user: {
        avatar_url: node.author.avatarUrl,
        login: node.author.login,
        html_url: node.author.url
      },
      created_at: node.createdAt,
      body_html: node.bodyHTML,
      html_url: `https://github.com/${owner}/${repo}/issues/${issue.number}#issuecomment-${node.databaseId}`
    }))

    let cs

    if (pagerDirection === 'last') {
      cs = [...items, ...comments]
    } else {
      cs = [...comments, ...items]
    }

    const isLoadOver = data.pageInfo.hasPreviousPage === false || data.pageInfo.hasNextPage === false
    this.setState({
      comments: cs,
      isLoadOver,
      cursor: data.pageInfo.startCursor || data.pageInfo.endCursor
    })
    return cs
  })
}

export default getComments
