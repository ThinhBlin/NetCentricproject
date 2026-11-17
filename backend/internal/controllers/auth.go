package controllers

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/response"
	"backend/internal/services"
)

type AuthController struct{ svc *services.AuthService }

func NewAuthController(s *services.AuthService) *AuthController { return &AuthController{s} }

type loginReq struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type registerReq struct {
	Name        string `json:"name" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required"`
	PhoneNumber string `json:"phoneNumber" binding:"required"`
}

func (a *AuthController) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Email and password are required")
		return
	}
	u, tok, err := a.svc.Login(req.Email, req.Password)
	if err != nil {
		a.fail(c, err)
		return
	}
	r := response.New(http.StatusOK, "User Logged in Successfully")
	r.Token = tok
	r.Role = string(u.Role)
	r.ExpirationTime = services.ExpirationText
	r.User = u
	response.Send(c, r)
}

func (a *AuthController) Register(c *gin.Context) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed: name, valid email, password and phoneNumber are required")
		return
	}
	u, err := a.svc.Register(req.Name, req.Email, req.Password, req.PhoneNumber)
	if err != nil {
		a.fail(c, err)
		return
	}
	r := response.New(http.StatusOK, "Account created successfully. You may now log in.")
	r.User = u
	response.Send(c, r)
}

func (a *AuthController) fail(c *gin.Context, err error) {
	var ae *services.AuthError
	if errors.As(err, &ae) {
		response.Error(c, ae.Status, ae.Message)
		return
	}
	log.Printf("auth error: %v", err)
	response.Error(c, http.StatusInternalServerError, "Internal server error")
}
