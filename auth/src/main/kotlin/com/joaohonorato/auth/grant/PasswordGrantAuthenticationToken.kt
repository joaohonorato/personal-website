package com.joaohonorato.auth.grant

import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationGrantAuthenticationToken
import org.springframework.security.oauth2.core.AuthorizationGrantType

class PasswordGrantAuthenticationToken(
    val username: String,
    val password: String,
    clientPrincipal: Authentication,
    additionalParameters: Map<String, Any>,
) : OAuth2AuthorizationGrantAuthenticationToken(
    AuthorizationGrantType("password"),
    clientPrincipal,
    additionalParameters,
)
