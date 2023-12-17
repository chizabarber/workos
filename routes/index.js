import express from 'express'
import session from 'express-session'
import { WorkOS } from '@workos-inc/node'


const app = express()
const router = express.Router()

app.use(
    session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true },
    })
)

const workos = new WorkOS(process.env.WORKOS_API_KEY)
const clientID = process.env.WORKOS_CLIENT_ID
const organizationID = 'org_01HHSZ5AP6ZWFACEM5816ZPE30'
const redirectURI = 'http://localhost:8000/callback'
const state = ''

router.get('/', async (req, res) => {
    if (session.isloggedin) {
      let before = req.query.before
      let after = req.query.after
  
      const directories = await workos.directorySync.listDirectories({
          limit: 5,
          before: before,
          after: after,
          order: null,
      })
  
      before = directories.listMetadata.before
      after = directories.listMetadata.after
  
      res.render('login_successful.ejs', {
          title: 'Home',
          directories: directories.data,
          before: before,
          after: after,
          profile: session.profile,
          first_name: session.first_name,
          last_name: session.last_name
      })
    } else {
        res.render('index.ejs', { title: 'Home' })
    }
})

router.post('/login', (req, res) => {
    const login_type = req.body.login_method

    const params = {
        clientID: clientID,
        redirectURI: redirectURI,
        state: state,
    }

    if (login_type === 'saml') {
        params.organization = organizationID
    } else {
        params.provider = login_type
    }

    try {
        const url = workos.sso.getAuthorizationURL(params)

        res.redirect(url)
    } catch (error) {
        res.render('error.ejs', { error: error })
    }
})

router.get('/callback', async (req, res) => {
    try {
        const { code } = req.query

        const profile = await workos.sso.getProfileAndToken({
            code,
            clientID,
        })
        const json_profile = JSON.stringify(profile, null, 4)

        session.first_name = profile.profile.first_name
        session.last_name = profile.profile.last_name
        session.profile = json_profile
        session.isloggedin = true

        res.redirect('/')
    } catch (error) {
        res.render('error.ejs', { error: error })
    }
})

router.get('/directory', async (req, res) => {
  const directories = await workos.directorySync.listDirectories()
  const directory = directories.data.filter((directory) => {
      return directory.id == req.query.id
  })[0]
  res.render('directory.ejs', {
      directory: directory,
      title: 'Directory',
  })
})

router.get('/users', async (req, res) => {
  const directoryId = req.query.id
  const users = await workos.directorySync.listUsers({
      directory: directoryId,
      limit: 100,
  })
  res.render('users.ejs', { users: users.data })
})

router.get('/logout', async (req, res) => {
    try {
        session.first_name = null
        session.last_name = null
        session.profile = null
        session.isloggedin = null

        res.redirect('/')
    } catch (error) {
        res.render('error.ejs', { error: error })
    }
})

export default router