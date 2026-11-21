package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"time"
)

func (a *App) configureAuth() error {
	host, from := os.Getenv("SMTP_HOST"), os.Getenv("SMTP_FROM")
	user, password := os.Getenv("SMTP_USERNAME"), os.Getenv("SMTP_PASSWORD")
	key := os.Getenv("EMAIL_CODE_SECRET")
	if host != "" || from != "" || user != "" || password != "" || key != "" || os.Getenv("SMTP_REQUIRED") == "true" {
		if host == "" || !validEmail(from) || len(key) < 32 || (user == "") != (password == "") {
			return fmt.Errorf("SMTP requires SMTP_HOST, a valid SMTP_FROM, EMAIL_CODE_SECRET of at least 32 bytes, and paired username/password if using SMTP authentication")
		}
		mode := env("SMTP_TLS_MODE", "starttls")
		if mode != "starttls" && mode != "implicit" {
			return fmt.Errorf("SMTP_TLS_MODE must be starttls or implicit")
		}
		port := env("SMTP_PORT", "587")
		a.EmailAuth = &emailAuth{key: []byte(key), send: func(to, purpose, code string) error {
			return sendSMTP(host, port, mode, from, user, password, to, purpose, code)
		}}
	}
	return a.configureGoogle()
}

func sendSMTP(host, port, mode, from, user, password, to, purpose, code string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	address := net.JoinHostPort(host, port)
	dialer := &net.Dialer{}
	tlsConfig := &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}
	var conn net.Conn
	var err error
	if mode == "implicit" {
		d := tls.Dialer{NetDialer: dialer, Config: tlsConfig}
		conn, err = d.DialContext(ctx, "tcp", address)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", address)
	}
	if err != nil {
		return err
	}
	defer conn.Close()
	deadline, _ := ctx.Deadline()
	if err := conn.SetDeadline(deadline); err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	if mode == "starttls" {
		if err := client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}
	if user != "" {
		if err := client.Auth(smtp.PlainAuth("", user, password, host)); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	message, err := client.Data()
	if err != nil {
		return err
	}
	action := map[string]string{"signup": "confirm your email", "login": "sign in", "reset": "reset your password"}[purpose]
	_, err = fmt.Fprintf(message, "From: HabitOn <%s>\r\nTo: %s\r\nSubject: HabitOn verification code\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nUse %s to %s. The code is valid for up to 10 minutes.\r\n\r\nIf you did not request this, you can ignore this email.\r\n", from, to, code, action)
	if err != nil {
		return err
	}
	return message.Close()
}
