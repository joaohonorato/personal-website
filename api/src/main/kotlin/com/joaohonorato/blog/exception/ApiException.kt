package com.joaohonorato.blog.exception

import org.springframework.http.HttpStatus

sealed class ApiException(message: String, val status: HttpStatus) : RuntimeException(message)

class ResourceNotFoundException(resource: String, id: Any) :
    ApiException("$resource '$id' not found", HttpStatus.NOT_FOUND)

class ConflictException(message: String) :
    ApiException(message, HttpStatus.CONFLICT)

class BadRequestException(message: String) :
    ApiException(message, HttpStatus.BAD_REQUEST)